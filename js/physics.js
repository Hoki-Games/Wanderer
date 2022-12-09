import { vec2, WTransformMatrix3, clamp } from './math.js';
export class WPhysicsModel {
    #origin;
    #local;
    #global;
    velocity; // m/s
    acceleration; // m/s²
    force; // N (kg∙m/s²)
    mass; // kg
    constructor({ location = vec2(0), rotation = 0, scale = vec2(1), skew = 0, mass = 1, velocity = vec2(0), acceleration = vec2(0), origin = vec2(0) } = {}) {
        this.#origin = Float32Array.from(origin);
        this.mass = mass;
        this.velocity = velocity;
        this.acceleration = acceleration;
        this.force = vec2(0);
        this.#local = new WTransformMatrix3({
            translate: location,
            rotate: rotation,
            scale,
            skew
        });
        this.#global = this.#local.copy();
        this.updateLocation(0);
    }
    applyForce(force) {
        this.force.add(force);
    }
    applyAcceleration(acceleration) {
        this.acceleration.add(acceleration);
    }
    applyVelocity(velocity) {
        this.velocity.add(velocity);
    }
    move(displacement) {
        const [tx, ty] = this.#local.t.sum(displacement);
        this.#local.translate(tx, ty);
    }
    updateLocation(dt) {
        this.applyAcceleration(this.force.scale(1 / this.mass));
        this.applyVelocity(this.acceleration.scale(dt));
        this.move(this.velocity.scale(dt));
        this.acceleration = vec2(0);
        this.force = vec2(0);
        this.#global.setArray(new Float32Array(this.#local.buffer));
    }
    get origin() {
        return this.#origin;
    }
    get local() {
        return this.#local;
    }
    get global() {
        return this.#global;
    }
}
class ObjectConstraint {
    owner;
    constructor(owner) {
        this.owner = owner;
    }
    solve() { }
}
class TargetConstraint extends ObjectConstraint {
    target;
    constructor(owner, target) {
        super(owner);
        this.target = target;
    }
}
export class WSpring extends TargetConstraint {
    L0;
    ks;
    constructor(owner, target, { L0, ks }) {
        super(owner, target);
        this.L0 = L0;
        this.ks = ks;
    }
    solve() {
        const diff = this.owner.global.t.dif(this.target.global.t);
        const dl = diff.size;
        const x = dl - this.L0;
        const f = this.ks * x;
        const F_ba = diff.scale(f / (dl || Infinity));
        const F_ab = F_ba.neg;
        this.owner.applyForce(F_ab);
        this.target.applyForce(F_ba);
    }
}
export class WRope extends TargetConstraint {
    length;
    bounce;
    constructor(owner, target, { length, bounce }) {
        super(owner, target);
        this.length = length;
        this.bounce = bounce;
    }
    solve() {
        const dir = this.target.global.t.dif(this.owner.global.t);
        const diff = dir.size;
        if (diff > this.length) {
            const sum = this.owner.mass + this.target.mass;
            let r1;
            let r2;
            if (Number.isFinite(this.owner.mass)) {
                if (Number.isFinite(this.target.mass)) {
                    r1 = this.target.mass / sum;
                    r2 = this.owner.mass / sum;
                }
                else {
                    r1 = 1;
                    r2 = 0;
                }
            }
            else {
                if (Number.isFinite(this.target.mass)) {
                    r1 = 0;
                    r2 = 1;
                }
                else {
                    r1 = 0;
                    r2 = 0;
                }
            }
            const mv = dir.scale((diff - this.length) / diff);
            const m1 = mv.scale(r1);
            const m2 = mv.scale(-r2);
            this.owner.move(m1);
            this.target.move(m2);
            this.owner.applyAcceleration(m1.scale(this.bounce));
            this.target.applyAcceleration(m2.scale(this.bounce));
        }
    }
}
export class CopyLocationConstraint extends TargetConstraint {
    axes;
    invert;
    offset;
    ownerRelativity;
    targetRelativity;
    constructor(owner, target, { axes = [true, true], invert = [false, false], offset = false, ownerRelativity = 'global', targetRelativity = 'global' } = {}) {
        super(owner, target);
        this.axes = axes;
        this.invert = invert;
        this.offset = offset;
        this.ownerRelativity = ownerRelativity;
        this.targetRelativity = targetRelativity;
    }
    solve() {
        const o = this.ownerRelativity == 'local'
            ? this.owner.local.t
            : this.owner.global.t;
        const t = this.targetRelativity == 'local'
            ? this.target.local.t
            : this.target.global.t;
        if (this.axes[0]) {
            const i = this.invert[0] ? -1 : 1;
            this.owner.global.translateX(t.x * i + ((this.offset) ? o.x : 0));
        }
        if (this.axes[1]) {
            const i = this.invert[1] ? -1 : 1;
            this.owner.global.translateY(t.y * i + ((this.offset) ? o.y : 0));
        }
    }
}
export class CopyRotationConstraint extends TargetConstraint {
    invert;
    offset;
    ownerRelativity;
    targetRelativity;
    constructor(owner, target, { invert = false, offset = false, ownerRelativity = 'global', targetRelativity = 'global' } = {}) {
        super(owner, target);
        this.invert = invert;
        this.offset = offset;
        this.ownerRelativity = ownerRelativity;
        this.targetRelativity = targetRelativity;
    }
    solve() {
        const i = this.invert ? -1 : 1;
        const o = this.ownerRelativity == 'local'
            ? this.owner.local.r
            : this.owner.global.r;
        const t = this.targetRelativity == 'local'
            ? this.target.local.r
            : this.target.global.r;
        this.owner.global.rotate(t * i + ((this.offset) ? o : 0));
    }
}
export class CopyScaleConstraint extends TargetConstraint {
    axes;
    offset;
    ownerRelativity;
    targetRelativity;
    constructor(owner, target, { axes = [true, true], offset = false, ownerRelativity = 'global', targetRelativity = 'global' } = {}) {
        super(owner, target);
        this.axes = axes;
        this.offset = offset;
        this.ownerRelativity = ownerRelativity;
        this.targetRelativity = targetRelativity;
    }
    solve() {
        const o = this.ownerRelativity == 'local'
            ? this.owner.local.s
            : this.owner.global.s;
        const t = this.targetRelativity == 'local'
            ? this.target.local.s
            : this.target.global.s;
        if (this.axes[0]) {
            this.owner.global.scaleX(t.x * (this.offset ? o.x : 1));
        }
        if (this.axes[1]) {
            this.owner.global.scaleY(t.y * (this.offset ? o.y : 1));
        }
    }
}
export class CopyTransformsConstraint extends TargetConstraint {
    mixMode;
    ownerRelativity;
    targetRelativity;
    constructor(owner, target, { mixMode = 'replace', ownerRelativity = 'global', targetRelativity = 'global' } = {}) {
        super(owner, target);
        this.mixMode = mixMode;
        this.ownerRelativity = ownerRelativity;
        this.targetRelativity = targetRelativity;
    }
    solve() {
        const og = this.owner.global;
        const o = this.ownerRelativity == 'local'
            ? this.owner.local
            : og;
        const t = this.targetRelativity == 'local'
            ? this.target.local
            : this.target.global;
        switch (this.mixMode) {
            case 'replace':
                og.setArray(new Float32Array(t.buffer));
                break;
            case 'split':
                og.scale(t.sx * o.sx, t.sy * o.sy, false);
                og.skew(t.k + o.k, false);
                og.rotate(t.r + o.r, false);
                og.translate(t.tx + o.tx, t.ty + o.ty);
                break;
            case 'beforeFull':
                og.setArray(new Float32Array(t.mult(o).buffer));
                break;
            case 'afterFull':
                og.setArray(new Float32Array(o.mult(t).buffer));
                break;
            default:
                throw new Error('Invalid mix mode', { cause: this.mixMode });
        }
    }
}
export class LimitDistanceConstraint extends TargetConstraint {
    distance;
    clampRegion;
    ownerRelativity;
    targetRelativity;
    constructor(owner, target, { distance = 0, clampRegion = 'inside', ownerRelativity = 'global', targetRelativity = 'global' } = {}) {
        super(owner, target);
        this.distance = distance;
        this.clampRegion = clampRegion;
        this.ownerRelativity = ownerRelativity;
        this.targetRelativity = targetRelativity;
    }
    solve() {
        const og = this.owner.global;
        const o = this.ownerRelativity == 'local'
            ? this.owner.local
            : og;
        const t = this.targetRelativity == 'local'
            ? this.target.local
            : this.target.global;
        const dir = t.t.dif(o.t);
        const dist = dir.size;
        const diff = dist - this.distance;
        if ((this.clampRegion == 'inside' && diff > 0) ||
            (this.clampRegion == 'outside' && diff < 0) ||
            (this.clampRegion == 'surface' && diff !== 0)) {
            const t = dir.scale(diff / dist).sum(og.t);
            og.translate(t.x ?? 0, t.y ?? 0);
        }
    }
}
export class LimitLocationConstraint extends ObjectConstraint {
    #influence;
    ownerRelativity;
    min;
    max;
    constructor(owner, { ownerRelativity = 'global', influence = 1, minX = -Infinity, minY = -Infinity, maxX = Infinity, maxY = Infinity } = {}) {
        super(owner);
        this.ownerRelativity = ownerRelativity;
        this.#influence = influence;
        this.min = vec2(minX, minY);
        this.max = vec2(maxX, maxY);
    }
    solve() {
        const og = this.owner.global;
        const o = this.ownerRelativity == 'local'
            ? this.owner.local
            : og;
        const minT = this.min.dif(o.t);
        const maxT = this.max.dif(o.t);
        const t = vec2(0);
        if (minT.x > 0) {
            if (maxT.x < 0)
                t.x = 0;
            else
                t.x = minT.x;
        }
        else if (maxT.x < 0)
            t.x = maxT.x;
        if (minT.y > 0) {
            if (maxT.y < 0)
                t.y = 0;
            else
                t.y = minT.y;
        }
        else if (maxT.y < 0)
            t.y = maxT.y;
        og.translate(og.tx + t.x * this.influence, og.ty + t.y * this.influence);
    }
    get influence() {
        return this.#influence;
    }
    set influence(v) {
        this.#influence = clamp(v, 0, 1);
    }
}
export class LimitScaleConstraint extends TargetConstraint {
}
export class LimitRotationConstraint extends TargetConstraint {
}
