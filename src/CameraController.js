import Phaser from 'phaser';

/**
 * Reusable pan/zoom/inertia controller for a Phaser scene's main camera.
 * - Drag (mouse or single touch) pans the camera.
 * - Mouse wheel or two-finger pinch zooms, clamped to [minZoom, maxZoom].
 * - On release, the camera keeps drifting on its last drag velocity and
 *   decelerates (friction) until it stops — the "Clash of Clans" inertia feel.
 *
 * Usage: create in scene.create(), call controller.update() from scene.update().
 */
export class CameraController {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    this.minZoom = options.minZoom ?? 0.5;
    this.maxZoom = options.maxZoom ?? 2.5;
    this.zoomSpeed = options.zoomSpeed ?? 0.0015;
    this.friction = options.friction ?? 0.9;
    this.stopThreshold = options.stopThreshold ?? 0.05;

    this.isDragging = false;
    this.lastPointerPos = null;
    this.velocity = { x: 0, y: 0 };

    this.pinchStartDistance = null;
    this.pinchStartZoom = null;

    // Le mode édition (voir editor/MapEditor.js) désactive le pan au glisser
    // pour que peindre des tuiles ne fasse pas aussi défiler la caméra — le
    // zoom molette reste actif dans les deux cas.
    this.enabled = true;

    // A second active pointer is required for pinch-to-zoom on touch devices.
    scene.input.addPointer(1);

    this._bindInput();
  }

  _bindInput() {
    const input = this.scene.input;
    input.on('pointerdown', this._onPointerDown, this);
    input.on('pointermove', this._onPointerMove, this);
    input.on('pointerup', this._onPointerUp, this);
    input.on('pointerupoutside', this._onPointerUp, this);
    input.on('wheel', this._onWheel, this);
  }

  _getActivePointers() {
    return this.scene.input.manager.pointers.filter((p) => p.isDown);
  }

  _onPointerDown() {
    if (!this.enabled) return;
    const active = this._getActivePointers();

    if (active.length >= 2) {
      this.isDragging = false;
      this.velocity.x = 0;
      this.velocity.y = 0;
      const [p1, p2] = active;
      this.pinchStartDistance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      this.pinchStartZoom = this.camera.zoom;
    } else {
      const pointer = active[0];
      this.isDragging = true;
      this.lastPointerPos = { x: pointer.x, y: pointer.y };
      this.velocity.x = 0;
      this.velocity.y = 0;
    }
  }

  _onPointerMove(pointer) {
    if (!this.enabled) return;
    const active = this._getActivePointers();

    if (active.length >= 2) {
      this.isDragging = false;
      const [p1, p2] = active;
      const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);

      if (this.pinchStartDistance) {
        const scaleFactor = distance / this.pinchStartDistance;
        const newZoom = Phaser.Math.Clamp(
          this.pinchStartZoom * scaleFactor,
          this.minZoom,
          this.maxZoom
        );
        this.camera.setZoom(newZoom);
      }
      return;
    }

    if (!this.isDragging || !pointer.isDown || !this.lastPointerPos) return;

    const dx = pointer.x - this.lastPointerPos.x;
    const dy = pointer.y - this.lastPointerPos.y;

    this.camera.scrollX -= dx / this.camera.zoom;
    this.camera.scrollY -= dy / this.camera.zoom;

    this.velocity.x = dx;
    this.velocity.y = dy;
    this.lastPointerPos = { x: pointer.x, y: pointer.y };
  }

  _onPointerUp() {
    const active = this._getActivePointers();

    if (active.length < 2) {
      this.pinchStartDistance = null;
      this.pinchStartZoom = null;
    }
    if (active.length === 0) {
      this.isDragging = false;
      this.lastPointerPos = null;
    }
  }

  _onWheel(_pointer, _gameObjects, _deltaX, deltaY) {
    const newZoom = Phaser.Math.Clamp(
      this.camera.zoom - deltaY * this.zoomSpeed,
      this.minZoom,
      this.maxZoom
    );
    this.camera.setZoom(newZoom);
  }

  /** Call every frame (scene.update) to apply inertia after a drag release. */
  update() {
    if (this.isDragging) return;

    if (Math.abs(this.velocity.x) < this.stopThreshold && Math.abs(this.velocity.y) < this.stopThreshold) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      return;
    }

    this.camera.scrollX -= this.velocity.x / this.camera.zoom;
    this.camera.scrollY -= this.velocity.y / this.camera.zoom;

    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;
  }
}
