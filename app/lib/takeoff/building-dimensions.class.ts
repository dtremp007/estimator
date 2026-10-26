import { type Prisma } from "@prisma/client"

export type BuildingDimensionsData = Prisma.BuildingDimensionsGetPayload<{
    select: {
      width: true,
      wallHeight: true,
      length: true,
      totalInteriorWallsLength: true,
      roofRisePerFoot: true,
      soffitOverhangWidth: true,
    }
  }>;

export class BuildingDimensions {
	constructor(
		public width: number,
		public wallHeight: number,
		public length: number,
		public totalInteriorWallsLength: number,
		public roofRisePerFoot: number,
		public soffitOverhangWidth: number,
	) {
		this.width = width
		this.wallHeight = wallHeight
		this.length = length
		this.totalInteriorWallsLength = totalInteriorWallsLength
		this.roofRisePerFoot = roofRisePerFoot
		this.soffitOverhangWidth = soffitOverhangWidth
	}

    static fromObject(obj: BuildingDimensionsData) {
        return new BuildingDimensions(
            obj.width,
            obj.wallHeight,
            obj.length,
            obj.totalInteriorWallsLength,
            obj.roofRisePerFoot,
            obj.soffitOverhangWidth,
        )
    }

    static dummy() {
        return new BuildingDimensions(25, 8, 50, 100, 3, 1)
    }

	get floorSurfaceArea() {
		return this.width * this.length
	}

	get exteriorWallSurfaceArea() {
		return 2 * this.wallHeight * (this.width + this.length)
	}

	get interiorWallSurfaceArea() {
		return this.totalInteriorWallsLength * this.wallHeight * 2
	}

	get slopeFactor() {
		return (
			Math.sqrt(
				Math.pow(this.roofRisePerFoot, 2) +
					Math.pow(this.soffitOverhangWidth, 2),
			) / 12
		)
	}

    get roofBaseLength() {
        return this.length + 2 * this.soffitOverhangWidth
    }

    get roofBaseWidth() {
        return this.width + 2 * this.soffitOverhangWidth
    }

    get roofSurfaceArea() {
        return this.roofBaseLength * this.roofBaseWidth * this.slopeFactor
    }

    get exteriorWallLinearFeet() {
        return 2 * (this.width + this.length)
    }

    get interiorWallLinearFeet() {
        return this.totalInteriorWallsLength
    }
}
