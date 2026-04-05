import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.sowaatmenswear.com'
  
  let productUrls: MetadataRoute.Sitemap = []
  
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products?limit=1000`)
    const data = await res.json()
    const products = data.products || data || []
    
    productUrls = products.map((p: any) => ({
      url: `${baseUrl}/products/${p.slug || p._id}`,
      lastModified: new Date(p.updatedAt || p.createdAt || Date.now()),
      changeFrequency: 'weekly' as const,
      priority: 0.8
    }))
  } catch (e) {
    console.log('Sitemap: could not fetch products')
  }

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/category/t-shirts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/category/shirts`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/category/pants`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ...productUrls
  ]
}
