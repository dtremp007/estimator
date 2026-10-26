export interface LookupTable<U> {
    get(
        name: string,
        defaultValue: any,
        options?: Record<string, any>,
    ): typeof defaultValue

    getLookupHistory(): U[]
  }
