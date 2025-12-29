declare module 'pdf-parse' {
	export interface PdfParseInfo {
		numPages?: number
		pages?: number
	}

	export type PdfParseTextResult =
		| string
		| {
			text?: string
			value?: string
		}

	export interface PdfParseOptions {
		data: Buffer | Uint8Array
		verbosity?: number
		disableWorker?: boolean
		isServerSide?: boolean
		useWorker?: boolean
	}

	export class PDFParse {
		constructor(options: PdfParseOptions)
		load(): Promise<void>
		getText(): Promise<PdfParseTextResult>
		getInfo(): Promise<PdfParseInfo>
		destroy(): Promise<void>
	}
}
