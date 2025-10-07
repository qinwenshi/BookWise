import { configManager } from './config-manager'

export interface S3Config {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
}

export interface S3Object {
  key: string
  lastModified: Date
  size: number
}

export interface ListObjectsResponse {
  objects: S3Object[]
}

export class S3Client {
  private endpoint: string
  private accessKeyId: string
  private secretAccessKey: string
  private bucketName: string

  constructor() {
    const config = configManager.getConfig()
    const accountId = config.sync.r2_account_id
    this.endpoint = accountId ? `https://${accountId}.r2.cloudflarestorage.com` : ''
    this.accessKeyId = config.sync.r2_access_key_id
    this.secretAccessKey = config.sync.r2_secret_access_key
    this.bucketName = config.sync.r2_bucket_name
    
    console.log('S3Client initialized with:', {
      endpoint: this.endpoint,
      bucketName: this.bucketName,
      accessKeyId: this.accessKeyId.substring(0, 8) + '...',
      hasSecretKey: !!this.secretAccessKey
    })
    
    // 验证endpoint格式
    if (!this.endpoint.startsWith('http://') && !this.endpoint.startsWith('https://')) {
      throw new Error('Endpoint URL must start with http:// or https://')
    }
    
    // 确保endpoint不以斜杠结尾
    if (this.endpoint.endsWith('/')) {
      this.endpoint = this.endpoint.slice(0, -1)
    }
  }

  private async sign(method: string, path: string, headers: Record<string, string> = {}, timestamp?: string) {
    const url = new URL(path, this.endpoint)
    const isoTimestamp = timestamp || new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')
    const date = isoTimestamp.substr(0, 8)
    
    // 添加必需的headers
    const allHeaders = {
      'host': url.host,
      'x-amz-date': isoTimestamp,
      ...headers
    }
    
    const canonicalHeaders = Object.keys(allHeaders)
      .sort()
      .map(key => `${key.toLowerCase()}:${allHeaders[key].toString().trim()}`)
      .join('\n') + '\n'
    
    const signedHeaders = Object.keys(allHeaders)
      .sort()
      .map(key => key.toLowerCase())
      .join(';')

    const canonicalRequest = [
      method,
      url.pathname,
      url.search.slice(1),
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n')

    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${date}/auto/s3/aws4_request`
    const stringToSign = [
      algorithm,
      isoTimestamp,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n')

    const signature = await this.getSignature(stringToSign, date)
    
    return {
      authorization: `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      timestamp: isoTimestamp,
      headers: allHeaders
    }
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async hmac(key: Uint8Array, message: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
    return new Uint8Array(signature)
  }

  private async getSignature(stringToSign: string, date: string): Promise<string> {
    const kDate = await this.hmac(new TextEncoder().encode(`AWS4${this.secretAccessKey}`), date)
    const kRegion = await this.hmac(kDate, 'auto')
    const kService = await this.hmac(kRegion, 's3')
    const kSigning = await this.hmac(kService, 'aws4_request')
    const signature = await this.hmac(kSigning, stringToSign)
    
    return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async generatePresignedUrl(method: string, path: string, expiresIn = 3600): Promise<string> {
    const url = new URL(path, this.endpoint)
    const isoTimestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')
    const date = isoTimestamp.substr(0, 8)
    
    // 保留原有的查询参数
    const existingParams = new URLSearchParams(url.search)
    
    // 添加AWS签名相关的查询参数
    const params = new URLSearchParams()
    
    // 先添加原有的查询参数
    for (const [key, value] of existingParams) {
      params.append(key, value)
    }
    
    // 再添加AWS签名参数
    params.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
    params.set('X-Amz-Credential', `${this.accessKeyId}/${date}/auto/s3/aws4_request`)
    params.set('X-Amz-Date', isoTimestamp)
    params.set('X-Amz-Expires', expiresIn.toString())
    params.set('X-Amz-SignedHeaders', 'host')
    
    // 对查询参数进行排序（AWS要求）
    params.sort()
    
    const canonicalHeaders = `host:${url.host}\n`
    const signedHeaders = 'host'
    
    const canonicalRequest = [
      method,
      url.pathname,
      params.toString(),
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n')

    console.log('Canonical request:', canonicalRequest)

    const algorithm = 'AWS4-HMAC-SHA256'
    const credentialScope = `${date}/auto/s3/aws4_request`
    const stringToSign = [
      algorithm,
      isoTimestamp,
      credentialScope,
      await this.sha256(canonicalRequest)
    ].join('\n')

    console.log('String to sign:', stringToSign)

    const signature = await this.getSignature(stringToSign, date)
    params.append('X-Amz-Signature', signature)
    
    const finalUrl = `${url.origin}${url.pathname}?${params.toString()}`
    console.log('Generated presigned URL:', finalUrl)
    
    return finalUrl
  }

  async putObject(key: string, body: string | Uint8Array, contentType = 'application/json'): Promise<void> {
    const headers = {
      'Content-Type': contentType,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    }

    const signResult = await this.sign('PUT', `/${this.bucketName}/${key}`, headers)
    const url = new URL(`/${this.bucketName}/${key}`, this.endpoint)
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        ...signResult.headers,
        'Authorization': signResult.authorization
      },
      body: body as BodyInit
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to upload object: ${response.status} ${response.statusText} - ${errorText}`)
    }
  }

  async getObject(key: string): Promise<string> {
    const path = `/${this.bucketName}/${key}`
    
    // 使用预签名URL来避免CORS preflight请求
    const presignedUrl = await this.generatePresignedUrl('GET', path)
    console.log('Generated presigned URL for getObject:', presignedUrl)
    
    // 不设置任何选项，让浏览器使用默认的GET请求
    const response = await fetch(presignedUrl)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Object not found')
      }
      const errorText = await response.text()
      throw new Error(`Failed to get object: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.text()
  }

  async listObjects(prefix = ''): Promise<ListObjectsResponse> {
    const queryParams = new URLSearchParams()
    if (prefix) {
      queryParams.append('prefix', prefix)
    }
    
    const path = `/${this.bucketName}/?${queryParams.toString()}`
    
    // 使用预签名URL来避免CORS preflight请求
    const presignedUrl = await this.generatePresignedUrl('GET', path)
    console.log('Generated presigned URL for listObjects:', presignedUrl)
    
    // 不设置任何选项，让浏览器使用默认的GET请求
    const response = await fetch(presignedUrl)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to list objects: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const xmlText = await response.text()
    return this.parseListObjectsResponse(xmlText)
  }

  private parseListObjectsResponse(xmlText: string): ListObjectsResponse {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlText, 'text/xml')
    
    const objects: S3Object[] = []
    const contents = doc.querySelectorAll('Contents')
    
    contents.forEach(content => {
      const key = content.querySelector('Key')?.textContent
      const lastModified = content.querySelector('LastModified')?.textContent
      const size = content.querySelector('Size')?.textContent
      
      if (key && lastModified && size) {
        objects.push({
          key,
          lastModified: new Date(lastModified),
          size: parseInt(size, 10)
        })
      }
    })

    return { objects }
  }

  async deleteObject(key: string): Promise<void> {
    const headers = {
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD'
    }

    const signResult = await this.sign('DELETE', `/${this.bucketName}/${key}`, headers)
    const url = new URL(`/${this.bucketName}/${key}`, this.endpoint)
    
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        ...signResult.headers,
        'Authorization': signResult.authorization
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to delete object: ${response.status} ${response.statusText} - ${errorText}`)
    }
  }
}