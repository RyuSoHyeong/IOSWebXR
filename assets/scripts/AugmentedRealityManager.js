// AugmentedRealityManager.js
var AugmentedRealityManager = pc.createScript('augmentedRealityManager');

AugmentedRealityManager.attributes.add('spaceType', {
  type: 'string',
  enum: [
    { 'XRSPACE_VIEWER': pc.XRSPACE_VIEWER },
    { 'XRSPACE_LOCAL': pc.XRSPACE_LOCAL },
    { 'XRSPACE_LOCALFLOOR': pc.XRSPACE_LOCALFLOOR }
  ],
  default: pc.XRSPACE_LOCALFLOOR
});

AugmentedRealityManager.attributes.add('defaultCameraEntity', { type: 'entity' });
AugmentedRealityManager.attributes.add('arCameraEntity', { type: 'entity' });
AugmentedRealityManager.attributes.add('useLightEstimation', { type: 'boolean', default: false });
AugmentedRealityManager.attributes.add('useHitTest', { type: 'boolean', default: true });

AugmentedRealityManager.prototype.initialize = function () {
  if (!this.defaultCameraEntity?.camera) { console.error('[AR] invalid defaultCameraEntity'); return; }
  if (!this.arCameraEntity?.camera)      { console.error('[AR] invalid arCameraEntity'); return; }

  this.defaultCameraEntity.enabled = true;
  this.arCameraEntity.enabled = false;
  this._hitSource = null;

  this.app.on('ar:request:start', this._startAR, this);
  this.app.on('ar:request:end',   this._endAR, this);

  if (this.app.xr) {
    this.app.xr.on('start', this._onXrStart, this);
    this.app.xr.on('end',   this._onXrEnd, this);
    this.app.xr.on('error', (e)=>console.error('[AR] XR error:', e));
  }
};

AugmentedRealityManager.prototype._startAR = function () {
  this.defaultCameraEntity.enabled = false;
  this.arCameraEntity.enabled = true;

  const required = this.useHitTest ? ['hit-test'] : [];
  const optional = this.useLightEstimation ? ['light-estimation'] : [];

  this.arCameraEntity.camera.startXr(pc.XRTYPE_AR, this.spaceType, {
    requiredFeatures: required,
    optionalFeatures: optional
  });
};

AugmentedRealityManager.prototype._endAR = function () {
  this.app.xr.end();
};

AugmentedRealityManager.prototype._onXrStart = function () {
  this.app.fire('ar:onStart');

  if (this.useLightEstimation && this.app.xr.lightEstimation?.supported) {
    this.app.xr.lightEstimation.start();
  }

  if (this.useHitTest && this.app.xr.hitTest?.supported) {
    const self = this;
    this.app.xr.hitTest.start({
      spaceType: pc.XRSPACE_VIEWER,
      callback: function (err, source) {
        if (err || !source) {
          console.error('[AR] hit-test error:', err);
          self.app.fire('ar:hit:disabled');
          return;
        }
        self._hitSource = source;
        self.app.fire('ar:hit:start');

        source.on('result', function (pos, rot) {
          self.app.fire('ar:hit', pos, rot);
        });
        source.on('notfound', function () {
          self.app.fire('ar:hit:notfound');
        });
      }
    });
  } else {
    this.app.fire('ar:hit:disabled');
  }

  // как только пошёл апдейт XR — сцена «трекится»
  this.app.xr.once('update', () => this.app.fire('ar:onTracking'));
};

AugmentedRealityManager.prototype._onXrEnd = function () {
  if (this._hitSource) { try { this._hitSource.stop(); } catch(e) {} this._hitSource = null; }
  if (this.useLightEstimation && this.app.xr.lightEstimation?.supported) {
    this.app.xr.lightEstimation.end();
  }

  this.app.fire('ar:onEnd');

  // вернуть обычную камеру
  this.defaultCameraEntity.enabled = true;
  this.arCameraEntity.enabled = false;
};
