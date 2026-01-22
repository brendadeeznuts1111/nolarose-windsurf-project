// Bun type declarations for the anomaly prediction system
declare module "bun" {
	export function serve(options: {
		port?: number;
		fetch?: (
			req: Request,
			server: any,
		) => Response | Promise<Response> | undefined;
		websocket?: {
			open?: (ws: any) => void;
			message?: (ws: any, message: string | Buffer) => void;
			close?: (ws: any) => void;
			error?: (ws: any, error: Error) => void;
		};
	}): any;

	export const WebSocket: any;
	export type Server = any;
	export type ServerWebSocket<T = any> = any;
}

// Buffer type declaration
declare const Buffer: {
	new (data: any): Buffer;
	isBuffer(obj: any): obj is Buffer;
	prototype: Buffer;
};
