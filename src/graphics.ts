import { narrowColor, narrowDimension, WColor, WDimension } from './math.js'
import { WBasicObject } from './objects.js'

export type WUniformType = Int32Array | Uint32Array | Float32Array

interface WUniform {
	location: WebGLUniformLocation
	data: WUniformType
	type: 'i' | 'ui' | 'f'
}

type WAttributeType = 'BYTE' | 'SHORT' | 'UNSIGNED_BYTE'
	| 'UNSIGNED_SHORT' | 'FLOAT' | 'HALF_FLOAT' | 'INT'
export interface WAttributeData {
	data: ArrayBuffer
	type: WAttributeType
	length: GLint
}

interface WAttribute extends WAttributeData {
	location: GLuint
}

type WTexture = {
	data: TexImageSource
	location: WebGLTexture
	target: GLenum
}

type WTexParams = {
	[P in keyof typeof texParamMap]?: number | boolean
}

export type WTexSettings = {
	target?: GLenum
	level?: GLint
	internalformat?: GLint
	width?: GLsizei
	height?: GLsizei
	border?: GLint
	format?: GLenum
	type?: GLenum
	params?: WTexParams
}

type WGLData = {
	uniforms: {
		[key: string]: WUniform
	}
	buffers: {
		[key: string]: WebGLBuffer
	}
	attributes: {
		[key: string]: WAttribute
	}
	textures: WTexture[]
}

export type WShader = {
	source: string
	type: 'VERTEX_SHADER' | 'FRAGMENT_SHADER'
}

type WSettings = {
	backgroundColor: WColor
	viewport: WDimension
	enable: GLenum[]
	depthFunc: GLenum
}

export class WScene {
	display: HTMLCanvasElement
	gl: WebGL2RenderingContext
	settings: WSettings
	objects: {
		[key: string]: WBasicObject
	}

	constructor({
		canvas,
		settings
	}: {
		canvas: HTMLCanvasElement
		settings: WSettings
	}) {
		this.display = canvas;
		this.gl = canvas.getContext('webgl2');
		this.settings = settings
		this.objects = {}
	}

	init() {
		this.gl.clearColor(...narrowColor(this.settings.backgroundColor))

		this.settings.enable.forEach(v => this.gl.enable(v))

		this.gl.depthFunc(this.settings.depthFunc);
		
		this.gl.viewport(...narrowDimension(this.settings.viewport))

		for (const name in this.objects) {
			this.objects[name].init()
		}
	}

	draw() {
		this.gl.clear(
			WebGL2RenderingContext.COLOR_BUFFER_BIT |
			WebGL2RenderingContext.DEPTH_BUFFER_BIT
		);

		for (const name in this.objects) {
			this.objects[name].draw()
		}
	}

	addObject(name: string, value: WBasicObject): void
	addObject(entries: [string, WBasicObject][]): void
	addObject(entries: { [key: string]: WBasicObject }): void
	addObject(
		arg1: string 
			| [string, WBasicObject][] 
			| { [key: string]: WBasicObject },
		arg2?: WBasicObject
	) {
		if (typeof arg1 == 'string') {
			this.objects[arg1] = arg2;
		} else if (Array.isArray(arg1)) {
			arg1.forEach(([n, v]) => this.objects[n] = v)
		} else {
			for (const name in arg1) {
				this.objects[name] = arg1[name]
			}
		}
	}
}


const texParamMap = {
	PACK_ALIGNMENT: 'pixelStoreI',
	UNPACK_ALIGNMENT: 'pixelStoreI',
	UNPACK_FLIP_Y_WEBGL: 'pixelStoreI',
	UNPACK_PREMULTIPLY_ALPHA_WEBGL: 'pixelStoreI',
	UNPACK_COLORSPACE_CONVERSION_WEBGL: 'pixelStoreI',
	PACK_ROW_LENGTH: 'pixelStoreI',
	PACK_SKIP_PIXELS: 'pixelStoreI',
	PACK_SKIP_ROWS: 'pixelStoreI',
	UNPACK_ROW_LENGTH: 'pixelStoreI',
	UNPACK_IMAGE_HEIGHT: 'pixelStoreI',
	UNPACK_SKIP_PIXELS: 'pixelStoreI',
	UNPACK_SKIP_ROWS: 'pixelStoreI',
	UNPACK_SKIP_IMAGES: 'pixelStoreI',
	TEXTURE_MAG_FILTER: 'texI',
	TEXTURE_MIN_FILTER: 'texI',
	TEXTURE_WRAP_S: 'texI',
	TEXTURE_WRAP_T: 'texI',
	TEXTURE_BASE_LEVEL: 'texI',
	TEXTURE_COMPARE_FUN: 'texI',
	TEXTURE_COMPARE_MOD: 'texI',
	TEXTURE_MAX_LEVEL: 'texI',
	TEXTURE_WRAP_R: 'texI',
	TEXTURE_MAX_LOD: 'texF',
	TEXTURE_MIN_LOD: 'texF'
} as const

export class WRenderer {
	#data: WGLData

	scene: WScene
	program: WebGLProgram
	shaders: WebGLShader[]

	constructor({
		scene,
		shaders = []
	}: {
		scene: WScene
		shaders?: WShader[]
	}) {
		this.scene = scene

		this.#data = {
			uniforms: {},
			buffers: {},
			attributes: {},
			textures: []
		};

		const gl = scene.gl
		
		this.program = gl.createProgram();

		this.shaders = shaders.map(s => {
			const shader = gl.createShader(WebGL2RenderingContext[s.type]);
			
			gl.shaderSource(shader, s.source);

			gl.compileShader(shader);
			
			gl.attachShader(this.program, shader);

			return shader;
		})

		gl.linkProgram(this.program)
	}

	init({
		uniforms = {},
		attributes = {},
		textures = []
	}: {
		uniforms?: {[name: string]: WUniformType}
		attributes?: {[name: string]: WAttributeData}
		textures?: {
			img: TexImageSource
			settings?: WTexSettings
		}[]
	}) {
		for (const name in uniforms) {
			this.setUniform(name, uniforms[name]);
		}

		for (const name in attributes) {
			const attr = attributes[name]
			this.setAttribute(
				name,
				attr.data,
				attr.type,
				attr.length
			);
		}

		textures.forEach((v, id) => {
			this.setTexture({
				id,
				img: v.img,
				settings: v.settings
			})
		})
	}

	draw(vertsCount: GLsizei) {
		this.scene.gl.useProgram(this.program);

		this.#data.textures.forEach((v, i) => {
			this.scene.gl.activeTexture(WebGL2RenderingContext.TEXTURE0 + i);
			this.scene.gl.bindTexture(v.target, v.location);
		})

		for (const name in this.#data.uniforms) {
			const val = this.#data.uniforms[name]
			const length = <1 | 2 | 3 | 4>val.data.length
			const type = this.#data.uniforms[name].type
			const func = `uniform${length}${type}v` as const

			this.scene.gl[func](
				this.#data.uniforms[name].location,
				this.#data.uniforms[name].data
			)
		}

		for (const name in this.#data.attributes) {
			const attr = this.#data.attributes[name]
			this.scene.gl.bindBuffer(
				this.scene.gl.ARRAY_BUFFER,
				this.#data.buffers[name]
			);
			if (
				attr.type == 'INT'
			) {
				this.scene.gl.vertexAttribIPointer(
					attr.location,
					attr.length,
					WebGL2RenderingContext.INT,
					0,
					0
				);
			} else {
				this.scene.gl.vertexAttribPointer(
					attr.location,
					attr.length,
					WebGL2RenderingContext[attr.type],
					false,
					0,
					0
				);
			}
			this.scene.gl.enableVertexAttribArray(
				attr.location
			);
		}

		this.scene.gl.drawArrays(
			this.scene.gl.TRIANGLES,
			0,
			vertsCount
		)
	}

	getAttribute(name: string) {
		return this.#data.attributes[name].data;
	}
	setAttribute(
		name: string,
		value: ArrayBuffer,
		type: WAttributeType,
		length: GLint
	) {
		if (!(name in this.#data.attributes)) {
			this.#data.attributes[name] = {
				data: value,
				location: this.scene.gl.getAttribLocation(
					this.program,
					name
				),
				type,
				length
			}
			this.#data.buffers[name] = this.scene.gl.createBuffer();
		}
		this.#data.attributes[name].data = value;
		this.updateAttribute(name)
	}
	
	updateAttribute(name: string) {
		this.scene.gl.bindBuffer(
			this.scene.gl.ARRAY_BUFFER,
			this.#data.buffers[name]
		)
		this.scene.gl.bufferData(
			this.scene.gl.ARRAY_BUFFER,
			this.getAttribute(name),
			this.scene.gl.STATIC_DRAW
		);
	}
	
	getUniform(name: string) {
		return this.#data.uniforms[name].data;
	}
	setUniform(name: string, value: Int32Array | Uint32Array | Float32Array) {
		const type = (() => {switch (value.constructor) {
		case Int32Array: return 'i'
		case Uint32Array: return 'ui'
		case Float32Array: return 'f'
		default: throw new Error('Invalid data type')
		}})()

		if (value.length < 1 || value.length > 4)
			throw new Error('Array length must be in bounds [1, 4]');

		if (!(name in this.#data.uniforms)) {
			this.#data.uniforms[name] = {
				location: this.scene.gl.getUniformLocation(
					this.program,
					name
				),
				data: value,
				type
			}
		}
		this.#data.uniforms[name].data = value;
	}

	getTexture(id: number) {
		return this.#data.textures[id].data;
	}
	setTexture({
		id,
		img,
		settings = {}
	}: {
		id: number
		img: TexImageSource
		settings?: WTexSettings
	}) {
		const target = settings.target ?? WebGL2RenderingContext.TEXTURE_2D;
		const level = settings.target ?? 0;
		const internalformat =
			settings.internalformat ?? WebGL2RenderingContext.RGBA;
		const width = settings.width ?? img.width;
		const height = settings.height ?? img.height;
		const border = settings.border ?? 0;
		const format = settings.format ?? WebGL2RenderingContext.RGBA;
		const type = settings.type ?? WebGL2RenderingContext.UNSIGNED_BYTE;
		type Param = {
			name: GLenum
			value: number | boolean
		}
		const params = {
			pixelStoreI: <Param[]>[],
			texI: <Param[]>[],
			texF: <Param[]>[]
		}
		
		if (settings?.params) {
			for (const name in settings.params) {
				(<Param[]>params[texParamMap[name]]).push({
					name: WebGL2RenderingContext[name],
					value: settings.params[name]
				})
			}
		}

		const gl = this.scene.gl;
		
		const texture = gl.createTexture();
		
		gl.bindTexture(target, texture)

		params.pixelStoreI.forEach(v => gl.pixelStorei(v.name, v.value))

		gl.texImage2D(
			target,
			level,
			internalformat,
			width,
			height,
			border,
			format,
			type,
			img
		);

		params.texI.forEach(v => gl.texParameteri(
			target,
			v.name,
			<GLint>v.value
		));

		params.texF.forEach(v => gl.texParameterf(
			target, 
			v.name, 
			<GLfloat>v.value
		));

		this.#data.textures[id] = {
			data: img,
			location: texture,
			target
		};
	}
}