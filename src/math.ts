export type FixedArray<T, L extends number> =
	[T, ...T[]] & { readonly length: L }

export type WVec2<T1, T2 = T1> = [T1, T2]
export type WVec3<T1, T2 = T1, T3 = T1> = [T1, T2, T3]
export type WVec4<T1, T2 = T1, T3 = T1, T4 = T1> = [T1, T2, T3, T4]

export type WLine2<T1, T2 = T1> = FixedArray<WVec2<T1, T2>, 2>
export type WLine3<T1, T2 = T1, T3 = T1> = FixedArray<WVec3<T1, T2, T3>, 2>
export type WLine4<T1, T2 = T1, T3 = T1, T4 = T1> =
	FixedArray<WVec4<T1, T2, T3, T4>, 2>

export type WTri2<T1, T2 = T1> = FixedArray<WVec2<T1, T2>, 3>
export type WTri3<T1, T2 = T1, T3 = T1> = FixedArray<WVec3<T1, T2, T3>, 3>
export type WTri4<T1, T2 = T1, T3 = T1, T4 = T1> =
	FixedArray<WVec4<T1, T2, T3, T4>, 3>

type WColorObject = {
	r: GLclampf
	g: GLclampf
	b: GLclampf
	a: GLclampf
}
export type WColor = WColorObject | WVec4<GLclampf> | `#${string}`

type WDimensionObject = {
	x: GLint
	y: GLint
	width: GLsizei
	height: GLsizei
}
export type WDimension = WDimensionObject
	| WVec4<GLint, GLint, GLsizei, GLsizei>

export const narrowColor = (color: WColor): WVec4<GLclampf> => {
	let ret: WVec4<GLclampf>

	if (Array.isArray(color)) ret = [...color]
	else if (typeof color == 'object')
		ret = [color.r, color.g, color.b, color.a]
	else {
		const b4 = '([0-Fa-f])'.repeat(4)
		const b8 = '([0-Fa-f][0-Fa-f])'.repeat(4)
		
		const rgba4 = new RegExp(`^#${b4}?$`).exec(color)
		const rgba8 = new RegExp(`^#${b8}?$`).exec(color)

		if (rgba4) ret = 
			<WVec4<GLclampf>>rgba4.slice(1).map(v => parseInt(v, 16) / 15)
		else if (rgba8) ret = 
			<WVec4<GLclampf>>rgba8.slice(1).map(v => parseInt(v, 16) / 255)
		else throw new Error('Invalid color data', { cause: color })
	}

	if (Number.isNaN(ret[3])) ret[3] = 1

	return ret
}
	

export const narrowDimension = (color: WDimension):
	WVec4<GLint, GLint, GLsizei, GLsizei> => Array.isArray(color)
	? [...color]
	: [color.x, color.y, color.width, color.height]

/**
 * Simplifies {@link Vector2} creation.
 */
export const vec2 = (x: number, y?: number): Vector2 => new Vector2(x, y ?? x)

/**
  * Defines two-dimentional vector with x and y coordinates.
  */
export class Vector2 implements Iterable<number> {
	x: number
	y: number

	constructor(x = 0, y = 0) {
		this.x = x
		this.y = y
	}

	add(...v: Vector2[]) {
		v.forEach(v => {
			this.x += v.x;
			this.y += v.y;
		})
	}

	/**
	 * Calculates the sum of all given vectors and this.
	 * 
	 * _If no vectors were given, just returnes this._
	 */
	sum(...v: Vector2[]) {
		const ret = vec2(this.x, this.y)
		for (const vec of v) {
			ret.x += vec.x
			ret.y += vec.y
		}
		return ret
	}

	/**
	 * Calculates the difference between gien vector and this.
	 */
	dif(v: Vector2) {
		return vec2(this.x - v.x, this.y - v.y)
	}

	/**
	 * Calculates the multiplication of all given vectors and this.
	 * _If no vectors were given, just returnes this._
	 */
	mult(...v: Vector2[]) {
		const ret = vec2(this.x, this.y)
		for (const vec of v) {
			ret.x *= vec.x
			ret.y *= vec.y
		}
		return ret
	}

	/**
	 * Calculates the division of this by given vector.
	 * 
	 * _A/B_
	 */
	div(v: Vector2) {
		return vec2(this.x / v.x, this.y / v.y)
	}

	/**
	 * Calculates the multiplication of given number and this.
	 * 
	 * _n•A_
	 */
	scale(n: number) {
		return vec2(this.x * n, this.y * n)
	}

	/**
	 * Calculates the dot product of this and given vector.
	 * 
	 * _A•B_
	 */
	dot(v: Vector2) {
		return this.x * v.x + this.y * v.y
	}

	/**
	 * Calculates the triple product of this and given vector.
	 * 
	 * _(A×B)×A_
	 */
	triProd(v: Vector2) {
		const crossZ = this.x * v.y - this.y * v.x
		return vec2(this.y * crossZ, -this.x * crossZ)
	}

	/**
	 * Returns vector, perpendicular to this facing right.
	 * 
	 * ↱
	 */
	get right() {
		return vec2(this.y, -this.x)
	}

	/**
	 * Returns vector, perpendicular to this facing left.
	 * 
	 * ↰
	 */
	get left() {
		return vec2(-this.y, this.x)
	}

	/**
	 * Returns this vector but it's x and y are absolute.
	 */
	get abs() {
		return vec2(Math.abs(this.x), Math.abs(this.y))
	}

	/**
	 * Return this vector's length.
	 * 
	 * _|A|_
	 */
	get length() {
		return Math.hypot(this.x, this.y)
	}

	/**
	 * Returns a vector negative to this.
	 */
	get neg() {
		return vec2(-this.x, -this.y)
	}

	/**
	 * Returns this vector but with length equal to 1.
	 */
	get norm() {
		return this.scale(1 / this.length)
	}

	/**
	 * Return this vector's rotation.
	 */
	get rotation() {
		return Math.atan2(this.y, this.x)
	}

	get [Symbol.iterator]() {
		const me = this
		return function*() {
			yield* [me.x, me.y]
		}
	}

	/**
	 * Creates a vector from length and rotation.
	 */
	static fromDegree(degree: number, length = 1) {
		return vec2(length * Math.cos(degree), length * Math.sin(degree))
	}
}

export class WMatrix3 {
	protected _data: WTri3<number>

	constructor(data?: WTri3<number>) {
		this._data = data ?? [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1]
		]
	}

	get(): WTri3<number>
	get(col: number): WVec3<number>
	get(col: number, row: number): number
	get(col?: number, row?: number) {
		if (typeof row == 'number') {
			return this._data[col][row]
		} else if (typeof col == 'number') {
			return [...this._data[col]]
		} else {
			const [a, b, c] = this._data
			return [[...a], [...b], [...c]]
		}
	}

	set(value: WTri3<number>): void
	set(col: number, value: WVec3<number>): void
	set(col: number, row: number, value: number): void
	set(
		col: number | WTri3<number>,
		row?: number | WVec3<number>,
		value?: number
	) {
		if (typeof value == 'number') {
			this._data[<number>col][<number>row] = value
		} else if (Array.isArray(row)) {
			this._data[<number>col] = row
		} else if (Array.isArray(col)) {
			this._data = col
		} else throw new Error('Invalid data')
	}

	copy() {
		return new WMatrix3(this.get())
	}

	sum(...mat: WMatrix3[]) {
		const ret = []

		this._data.forEach((_, col) => {
			ret.push([])
			this._data[col].forEach((v1, row) => { 
				ret[col].push(mat.reduce((t, v) => t + v[col][row], v1))
			})
		})
		
		return new WMatrix3(<WTri3<number>>ret)
	}

	mult(mat: WMatrix3) {
		const a = this.get()
		const b = mat.get()

		// TODO: Turn to loop calc

		const r00 = a[0][0] * b[0][0] + a[1][0] * b[0][1] + a[2][0] * b[0][2]
		const r10 = a[0][0] * b[1][0] + a[1][0] * b[1][1] + a[2][0] * b[1][2]
		const r20 = a[0][0] * b[2][0] + a[1][0] * b[2][1] + a[2][0] * b[2][2]

		const r01 = a[0][1] * b[0][0] + a[1][1] * b[0][1] + a[2][1] * b[0][2]
		const r11 = a[0][1] * b[1][0] + a[1][1] * b[1][1] + a[2][1] * b[1][2]
		const r21 = a[0][1] * b[2][0] + a[1][1] * b[2][1] + a[2][1] * b[2][2]

		const r02 = a[0][2] * b[0][0] + a[1][2] * b[0][1] + a[2][2] * b[0][2]
		const r12 = a[0][2] * b[1][0] + a[1][2] * b[1][1] + a[2][2] * b[1][2]
		const r22 = a[0][2] * b[2][0] + a[1][2] * b[2][1] + a[2][2] * b[2][2]
		
		return new WMatrix3([
			[r00, r01, r02],
			[r10, r11, r12],
			[r20, r21, r22]
		])
	}

	transpose() {
		const m = this.get()

		this.set([
			[m[0][0], m[1][0], m[2][0]],
			[m[0][1], m[1][1], m[2][1]],
			[m[0][2], m[1][2], m[2][2]]
		])
	}
}

export class WTransformMatrix3 {
	#translate: Vector2
	#direct: Vector2
	#skew: number
	#scale: Vector2

	#data = new Float32Array(9)

	constructor({
		translate = vec2(0),
		rotate = 0,
		skew = 0,
		scale = vec2(1)
	}: {
		translate?: Vector2,
		rotate?: number,
		skew?: number,
		scale?: Vector2
	} = {}) {
		this.#translate = translate
		this.#direct = Vector2.fromDegree(rotate)
		this.#skew = Math.tan(skew)
		this.#scale = scale

		this.calcMatrix()
	}

	calcMatrix() {
		const [tx, ty] = this.#translate
		const [rx, ry] = this.#direct
		const [sx, sy] = this.#scale
		const k = this.#skew

		this.#data.set([
			rx * sx, ry * sx, 0,
			(rx * k - ry) * sy, (ry * k + rx) * sy, 0,
			tx, ty, 1
		])

		return this
	}

	calcFields() {
		const [m11, m12, , m21, m22, , m31, m32] = this.#data

		this.#direct = vec2(m11, m12).norm
		
		const sk = Math.atan2(m22, m21) - Math.PI / 2 - this.#direct.rotation
		this.#skew = -Math.tan(sk)
		
		this.#scale.x = Math.sqrt(m11 ** 2 + m12 ** 2)
		this.#scale.y = Math.sqrt(m21 ** 2 + m22 ** 2) * Math.cos(sk)
		
		this.#translate = vec2(m31, m32)

		return this
	}

	translateX(x: number) {
		this.#translate.x = x

		return this.calcMatrix()
	}

	translateY(y: number) {
		this.#translate.y = y

		return this.calcMatrix()
	}

	translate(x: number, y: number) {
		this.#translate = vec2(x, y)

		return this.calcMatrix()
	}

	rotate(r: number): WTransformMatrix3
	rotate(x: number, y: number): WTransformMatrix3
	rotate(v0: number, v1?: number) {
		if (v1 !== undefined) this.#direct = vec2(v0, v1).norm
		else this.#direct = Vector2.fromDegree(v0)

		return this.calcMatrix()
	}

	scaleX(sx: number) {
		this.#scale.x = sx

		return this.calcMatrix()
	}

	scaleY(sy: number) {
		this.#scale.y = sy

		return this.calcMatrix()
	}

	scale(sx: number, sy: number) {
		this.#scale = vec2(sx, sy)

		return this.calcMatrix()
	}

	skew(k: number) {
		this.#skew = Math.tan(k)

		return this.calcMatrix()
	}

	matrix(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) {
		this.#data.set([
			a, b, 0,
			c, d, 0,
			e, f, 1
		])

		return this.calcFields()
	}

	get tx() {
		return this.#translate.x
	}

	get ty() {
		return this.#translate.y
	}

	get t() {
		return this.#translate.sum()
	}

	get r() {
		return this.#direct.rotation
	}

	get sx() {
		return this.#scale.x
	}

	get sy() {
		return this.#scale.y
	}

	get s() {
		return this.#scale.sum()
	}

	get k() {
		return Math.atan(this.#skew)
	}

	get kt() {
		return this.#skew
	}

	get m() {
		const [a, b, , c, d, , e, f] = this.#data


		return [a, b, c, d, e, f]
	}
	
	get a() {
		return this.#data[0]
	}
	set a(v: number) {
		this.#data[0] = v

		this.calcFields()
	}

	get b() {
		return this.#data[1]
	}
	set b(v: number) {
		this.#data[1] = v

		this.calcFields()
	}

	get c() {
		return this.#data[3]
	}
	set c(v: number) {
		this.#data[3] = v

		this.calcFields()
	}

	get d() {
		return this.#data[4]
	}
	set d(v: number) {
		this.#data[4] = v

		this.calcFields()
	}

	get e() {
		return this.#data[6]
	}
	set e(v: number) {
		this.#data[6] = v

		this.calcFields()
	}

	get f() {
		return this.#data[7]
	}
	set f(v: number) {
		this.#data[7] = v

		this.calcFields()
	}
	
	get buffer() {
		return this.#data.buffer
	}
}

export const bezier = (x1: number, y1: number, x2: number, y2: number) => {
	if (x1 < 0 || x1 > 1) throw new Error('x1 is out of bounds', { cause: x1 })
	if (x2 < 0 || x2 > 1) throw new Error('x2 is out of bounds', { cause: x2 })
	
	const arr: WVec2<number>[] = []

	const pos = (a: number, b: number, t: number) =>
		t * (3 * a * (1 - t) ** 2 + t * (3 * b * (1 - t) + t))

	return (steps: number) => {
		for (let i = 0; i <= steps; i++) {
			const t = i / steps

			arr.push([
				pos(x1, x2, t),
				pos(y1, y2, t)
			])
		}

		return (x: number) => {
			if (x < 0 || x > 1) 
				throw new Error('x is out of bounds', { cause: x })

			const search = (l: number, r: number) => {
				if (r - l == 1) {
					const rX = arr[r][0]
					const lX = arr[l][0]
					const rY = arr[r][1]
					const lY = arr[l][1]

					return (x - rX) / (lX - rX) * lY + (x - lX) / (rX - lX) * rY
				}

				const i = Math.round(l + (r - l) / 2)
				const v = arr[i]

				if (v[0] < x) return search(i, r)
				else if (v[0] > x) return search(l, i)

				return v[1]
			}
		
			return search(0, arr.length - 1)
		}
	}
}

export const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(min, value), max)