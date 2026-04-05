import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout/', '/account/']
    },
    sitemap: 'https://www.sowaatmenswear.com/sitemap.xml'
  }
}
