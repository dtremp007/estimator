import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { prisma } from '#app/utils/db.server'

export async function loader({ params }: LoaderFunctionArgs) {
  const { imageId } = params
  invariantResponse(imageId, 'Image ID is required')

  const image = await prisma.logoImage.findUnique({
    where: { id: imageId },
    select: { blob: true, contentType: true },
  })

  invariantResponse(image, 'Image not found', { status: 404 })

  return new Response(image.blob, {
    headers: {
      'Content-Type': image.contentType,
      'Content-Length': Buffer.byteLength(image.blob).toString(),
      'Content-Disposition': `inline; filename="${imageId}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
