import { useMemo } from 'react'
import { z } from 'zod'
import { BuildingDimensions } from '#app/lib/takeoff/building-dimensions.class.js'

export const BuildingDimensionsSchema = z.object({
	width: z.number().min(1).max(100),
	length: z.number().min(1).max(100),
	wallHeight: z.number().min(1).max(100),
	totalInteriorWallsLength: z.number().min(1).max(100),
	roofRisePerFoot: z.number().min(1).max(100),
	soffitOverhangWidth: z.number().min(1).max(100),
})

export type BuildingDimensionsData = z.infer<typeof BuildingDimensionsSchema>

export function useBuildingDimensions(data: any) {
	return useMemo(() => {
		const parsedData = BuildingDimensionsSchema.parse(data)

		const {
			width,
			length,
			wallHeight,
			totalInteriorWallsLength,
			roofRisePerFoot,
			soffitOverhangWidth,
		} = parsedData

		return new BuildingDimensions(
			width,
			wallHeight,
			length,
			totalInteriorWallsLength,
			roofRisePerFoot,
			soffitOverhangWidth,
		)
	}, [data])
}
