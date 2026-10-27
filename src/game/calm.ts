import * as Phaser from 'phaser';

/* Players who ask their system for less motion (prefers-reduced-motion) get no screen shake and no
   full-screen colour flashes in the Fog. Patched once on the camera itself, so every scene and every
   effect follows it without each call site having to remember; the setting is read at each call,
   so changing it mid-run takes effect at once. Importing this module applies it. */

const calm = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

type Camera = Phaser.Cameras.Scene2D.Camera;
const proto = Phaser.Cameras.Scene2D.Camera.prototype as Camera & { __calm?: boolean };

if (!proto.__calm) {
  proto.__calm = true;
  const shake = proto.shake;
  proto.shake = function (this: Camera, ...args: Parameters<Camera['shake']>) {
    return calm() ? this : shake.apply(this, args);
  };
  const flash = proto.flash;
  proto.flash = function (this: Camera, ...args: Parameters<Camera['flash']>) {
    if (!calm()) return flash.apply(this, args);
    // Skip the flash, but still let anything waiting on its end carry on.
    const [, , , , , callback, context] = args;
    if (typeof callback === 'function') callback.call(context ?? this, this, 1);
    return this;
  };
}

export {};
