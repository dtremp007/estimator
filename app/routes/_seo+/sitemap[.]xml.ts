import { generateSitemap } from '@nasa-gcn/remix-seo'
import { type ServerBuild, type LoaderFunctionArgs } from 'react-router'
import { getDomainUrl } from '#app/utils/misc.tsx'

export async function loader({ request, context }: LoaderFunctionArgs) {
	const serverBuild = (await context.serverBuild) as ServerBuild
	return generateSitemap(
		request,
		// remix-seo is typed against Remix 2's route manifest, which has the same shape
		serverBuild.routes as Parameters<typeof generateSitemap>[1],
		{
			siteUrl: getDomainUrl(request),
			headers: {
				'Cache-Control': `public, max-age=${60 * 5}`,
			},
		},
	)
}
