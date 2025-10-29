declare module 'luxon' {
  export interface DateTimeOptions {
    zone?: string
  }

  export class DateTime {
    static readonly DATETIME_MED_WITH_SECONDS: unknown

    static utc(): DateTime
    static fromISO(isoString: string, options?: DateTimeOptions): DateTime

    toISO(): string | null
    toLocal(): DateTime
    toLocaleString(format?: unknown): string

    valueOf(): number

    readonly isValid: boolean
  }
}
