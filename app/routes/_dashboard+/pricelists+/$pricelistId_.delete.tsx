import { invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs, redirect } from "@remix-run/node";
import { requireUserId } from "#app/utils/auth.server.js";
import { prisma } from "#app/utils/db.server.js";
import { requireUserWithPermission } from '#app/utils/permissions.server.js'

export async function action({ params, request }: ActionFunctionArgs) {
    const userId = await requireUserId(request);
    invariantResponse(params.pricelistId, 'Not found', { status: 404 })
    const pricelist = await prisma.pricelist.findUnique({
        where: { id: params.pricelistId },
        select: { ownerId: true },
    })
    invariantResponse(pricelist, 'Not found', { status: 404 })
    await requireUserWithPermission(request,
        pricelist.ownerId === userId ? 'delete:pricelist:own' : 'delete:pricelist:any',
    )

    await prisma.pricelist.delete({
        where: {
            id: params.pricelistId,
            ownerId: pricelist.ownerId,
        },
    });

    return redirect("/pricelists");
}
