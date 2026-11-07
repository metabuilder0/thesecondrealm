import {
  Group,
  Vector3
} from 'three';

import { SCALE_LOG } from '/js/modules/data/data-constants.js';
import { SceneParams } from '../../data/scene-params.js';
import { TourEditor } from './tour-editor.js';
import { HUDTourBuilderScreen } from './hud-tour-builder-screen.js';
import { HUDTourBuilderFilterScreen } from './hud-tour-builder-filter-screen.js';
import { HUDTourBuilderMenu } from './hud-tour-builder-menu.js';
import { HUDVirtualKeyboard } from './hud-virtual-keyboard.js';


class HUDTourBuilderPanel extends Group {

  /*
   * Attributes
   */

  world3d = null;
  hud = null;

  screen = null;
  filterScreen = null;
  menu = null;
  keyboard = null;
  tourEditor = null;

  mode = 'edit';
  exportFileName = 'tour.json';

  #sceneParams = null;
  #pendingPosition = null;
  #filterStageIndex = null;


  /*
   * Constructor
   */
  constructor(world3d, hud) {
    super();
    this.world3d = world3d;
    this.hud = hud;

    this.screen = new HUDTourBuilderScreen(world3d, hud, this, 0.27, 0.315);
    this.screen.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 3);
    this.add(this.screen);

    this.filterScreen = new HUDTourBuilderFilterScreen(world3d, hud, this, 0.27, 0.315);
    this.filterScreen.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 3);
    this.filterScreen.visible = false;
    this.add(this.filterScreen);

    this.menu = new HUDTourBuilderMenu(world3d, hud, this, 0.27, 0.034);
    this.menu.position.set(0, 0.105, -0.135);
    this.menu.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 9);
    this.add(this.menu);

    // Same pitch as the screen, just under its bottom edge and closer
    // to the user so it sits in front of the panel.
    this.keyboard = new HUDVirtualKeyboard(world3d);
    this.keyboard.position.set(0, -0.133, 0.270);
    this.keyboard.rotateOnAxis(new Vector3(1, 0, 0), -Math.PI / 3);
    this.add(this.keyboard);

    this.visible = false;
  }

  /*
   * Show the panel and load the scene tour, or an empty list.
   */
  activate(descriptor, sceneParams) {
    this.closeFilters();
    this.#sceneParams = sceneParams;
    this.tourEditor = new TourEditor(descriptor, sceneParams);
    this.exportFileName = HUDTourBuilderPanel.exportFileName(sceneParams);
    this.mode = 'edit';
    this.screen.setEditEnabled(true);
    this.menu.refresh();
    this.visible = true;
    this.#syncLayers();
  }

  /*
   * Capture the user position, then ask for a title.
   */
  addStage() {
    if (this.mode != 'edit' || !this.tourEditor) return;
    const position = this.world3d.camera.parent.position;
    this.#pendingPosition = [position.x, position.y, position.z];
    this.keyboard.open((title) => {
      const added = this.tourEditor.addStage(
        title,
        this.#pendingPosition,
        this.world3d.pointsCloud
      );
      if (!added) {
        this.hud.leftScreen.displayMessage(
          'TOUR BUILDER',
          'The current position could not be saved as a stage.',
          ''
        );
        return;
      }
      this.screen.refresh();
    });
  }

  removeStage(index) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    this.tourEditor.removeStage(index);
    this.screen.refresh();
  }

  moveStageUp(index) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    this.tourEditor.moveUp(index);
    this.screen.refresh();
  }

  moveStageDown(index) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    this.tourEditor.moveDown(index);
    this.screen.refresh();
  }

  /*
   * Replace the stage list with the filter editor and preview the result.
   */
  openFilters(index) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    if (!this.tourEditor.stages[index]) return;
    this.keyboard.close();
    this.#filterStageIndex = index;
    this.screen.visible = false;
    this.filterScreen.show(index);
    this.filterScreen.visible = true;
    this.#previewFilters();
  }

  /*
   * Back to the stage list. The points cloud shows every block again.
   */
  closeFilters() {
    const wasOpen = this.#filterStageIndex != null;
    this.#filterStageIndex = null;
    if (this.keyboard) this.keyboard.close();
    if (this.filterScreen) this.filterScreen.visible = false;
    if (this.screen) this.screen.visible = true;
    if (!wasOpen) return;
    if (this.world3d.pointsCloud) {
      this.world3d.pointsCloud.filterPointsCloud(null);
    }
    this.screen.refresh();
  }

  addFilterGroup(stageIndex) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    const condition = this.defaultCondition('x');
    if (!condition) {
      this.#rangeError();
      return;
    }
    if (!this.tourEditor.addFilterGroup(stageIndex, condition)) return;
    const filters = this.tourEditor.stages[stageIndex].filters;
    this.filterScreen.focus(filters.length - 1, null);
    this.#previewFilters();
  }

  addFilterCondition(stageIndex, groupIndex) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    const condition = this.defaultCondition('x');
    if (!condition) {
      this.#rangeError();
      return;
    }
    if (!this.tourEditor.addFilterCondition(stageIndex, groupIndex, condition)) return;
    const group = this.tourEditor.stages[stageIndex].filters[groupIndex];
    this.filterScreen.focus(groupIndex, group.length - 1);
    this.#previewFilters();
  }

  removeFilterGroup(stageIndex, groupIndex) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    this.tourEditor.removeFilterGroup(stageIndex, groupIndex);
    this.filterScreen.refresh();
    this.#previewFilters();
  }

  removeFilterCondition(stageIndex, groupIndex, conditionIndex) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    this.tourEditor.removeFilterCondition(stageIndex, groupIndex, conditionIndex);
    this.filterScreen.refresh();
    this.#previewFilters();
  }

  /*
   * Cycle x, y, z, key. The new condition covers the whole axis,
   * so it hides nothing until the bounds are narrowed.
   */
  cycleFilterAttribute(stageIndex, groupIndex, conditionIndex) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    const current = this.#filterCondition(stageIndex, groupIndex, conditionIndex);
    if (!current) return;
    const next = HUDTourBuilderFilterScreen.nextAttribute(current[0]);
    const condition = this.defaultCondition(next);
    if (!condition) {
      this.#rangeError();
      return;
    }
    this.tourEditor.setFilterCondition(stageIndex, groupIndex, conditionIndex, condition);
    this.filterScreen.refresh();
    this.#previewFilters();
  }

  /*
   * Ask for one bound. HERE captures the user's position on this axis.
   */
  editFilterBound(stageIndex, groupIndex, conditionIndex, which) {
    if (this.mode != 'edit' || !this.tourEditor) return;
    const current = this.#filterCondition(stageIndex, groupIndex, conditionIndex);
    if (!current) return;
    const bound = which == 'max' ? current[2] : current[1];
    this.keyboard.open((value) => {
      const latest = this.#filterCondition(stageIndex, groupIndex, conditionIndex);
      if (!latest) return;
      let min = which == 'min' ? value : latest[1];
      let max = which == 'max' ? value : latest[2];
      if (min > max) {
        const swap = min;
        min = max;
        max = swap;
      }
      this.tourEditor.setFilterCondition(
        stageIndex,
        groupIndex,
        conditionIndex,
        [latest[0], min, max]
      );
      this.filterScreen.refresh();
      this.#previewFilters();
    }, {
      placeholder: 'VALUE',
      initialText: HUDTourBuilderFilterScreen.fullValue(bound),
      numeric: true,
      onHere: () => {
        const latest = this.#filterCondition(stageIndex, groupIndex, conditionIndex);
        if (!latest) return null;
        return this.positionValue(latest[0]);
      },
      onInvalid: () => this.hud.leftScreen.displayMessage(
        'TOUR BUILDER',
        'Invalid number.',
        ''
      )
    });
  }

  /*
   * A condition that matches the whole data range of one attribute.
   * Returns null when the cloud has no finite range yet.
   */
  defaultCondition(attr) {
    const range = this.#attributeRange(attr);
    if (!range) return null;
    return [attr, range[0], range[1]];
  }

  /*
   * Raw value of the user position on one attribute.
   * Values at or above 1 are rounded to an integer.
   */
  positionValue(attr) {
    const pointsCloud = this.world3d.pointsCloud;
    if (!pointsCloud) {
      this.#positionError();
      return null;
    }
    const rig = this.world3d.camera.parent;
    const world = [rig.position.x, rig.position.y, rig.position.z];
    let value = null;
    if (attr == 'key') {
      value = pointsCloud.coords3dToHeight(world);
    } else {
      const raw = pointsCloud.coords3dToRawData(world);
      const axis = { x: 0, y: 1, z: 2 }[attr];
      if (raw && axis != null) value = raw[axis];
    }
    if (!Number.isFinite(value)) {
      this.#positionError();
      return null;
    }
    if (Math.abs(value) >= 1) return Math.round(value);
    return value;
  }

  /*
   * Teleport to the stage and show its filter.
   * A stage without a filter shows every point again.
   */
  teleportTo(index) {
    if (!this.tourEditor) return;
    const position = this.tourEditor.getStageWorldPosition(
      index,
      this.world3d.pointsCloud
    );
    if (!position) return;
    const rotation = this.world3d.camera.parent.rotation;
    this.world3d.camera.moveTo(position, [
      rotation.x,
      rotation.y,
      rotation.z
    ]);
    this.#applyStageFilters(index);
  }

  cycleType() {
    if (this.mode != 'edit' || !this.tourEditor) return;
    this.tourEditor.cycleType();
    this.menu.refresh();
  }

  /*
   * Store the camera rig pose as the scene spawn.
   * moveTo() restores camera.parent, which is the pose kept in sceneParams.
   */
  saveSpawnPosition() {
    if (!this.#sceneParams) return;
    const rig = this.world3d.camera.parent;
    this.#sceneParams.position = [rig.position.x, rig.position.y, rig.position.z];
    this.#sceneParams.rotation = [rig.rotation.x, rig.rotation.y, rig.rotation.z];
    sessionStorage.setItem('sceneParams', this.#sceneParams.toJSON());
    this.hud.leftScreen.displayMessage(
      'SPAWN POSITION',
      'Camera position and orientation saved.',
      ''
    );
  }

  /*
   * Download the descriptor. Existing fields (desc, audio, filters, ...)
   * are kept; the stage list is the edited one.
   */
  exportTour() {
    if (!this.tourEditor) return;
    const json = JSON.stringify(this.tourEditor.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.exportFileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.hud.leftScreen.displayMessage(
      'TOUR EXPORTED',
      this.exportFileName,
      ''
    );
  }

  toggleMode() {
    if (!this.tourEditor) return;
    if (this.mode == 'edit') {
      this.#enterTest();
    } else {
      this.#enterEdit();
    }
  }

  #enterTest() {
    this.closeFilters();
    // A GO preview must not stay on while the tour applies its own filters.
    if (this.world3d.pointsCloud) {
      this.world3d.pointsCloud.filterPointsCloud(null);
    }
    if (!this.tourEditor.stages.length) {
      this.hud.leftScreen.displayMessage(
        'TOUR BUILDER',
        'Add at least one stage before testing the tour.',
        ''
      );
      return;
    }

    const stored = SceneParams.fromJSON(sessionStorage.getItem('sceneParams'));
    const startPosition = stored && HUDTourBuilderPanel.#poseVector(stored.position);
    const startRotation = stored && HUDTourBuilderPanel.#poseVector(stored.rotation);
    if (!startPosition || !startRotation) {
      this.hud.leftScreen.displayMessage(
        'TOUR BUILDER',
        'The spawn position could not be resolved.',
        ''
      );
      return;
    }

    this.world3d.camera.moveTo(startPosition, startRotation);

    if (this.tourEditor.descriptor.initial_pos == null) {
      const initialPos = this.#initialPosInFrontOfCamera();
      if (initialPos != null) {
        this.tourEditor.descriptor.initial_pos = initialPos;
      }
    }

    const descriptor = this.tourEditor.toJSON();

    this.mode = 'test';
    this.keyboard.close();
    this.screen.setEditEnabled(false);
    this.menu.refresh();
    this.world3d.tourExitHandler = () => this.#enterEdit();

    let started = false;
    try {
      started = this.world3d.startTourFromDescriptor(descriptor);
    } catch (e) {
      console.log(e);
    }
    if (!started) {
      this.hud.leftScreen.displayMessage(
        'TOUR BUILDER',
        'The tour could not be started.',
        ''
      );
      this.#enterEdit();
    }
  }

  #enterEdit() {
    if (this.mode != 'test') return;
    this.mode = 'edit';
    this.world3d.stopTour();
    this.screen.setEditEnabled(true);
    this.menu.refresh();
  }

  /*
   * Code processed in the rendering loop.
   * Hidden controls stay on layer 1 so they are not raycast.
   */
  updatePanel() {
    this.#syncLayers();
    this.keyboard.syncLayers();
  }

  #previewFilters() {
    this.#applyStageFilters(this.#filterStageIndex);
  }

  /*
   * Show the filter of a stage. An empty filter shows every point.
   */
  #applyStageFilters(index) {
    const pointsCloud = this.world3d.pointsCloud;
    if (!pointsCloud || !this.tourEditor) return;
    const stage = this.tourEditor.stages[index];
    const filters = stage && Array.isArray(stage.filters) && stage.filters.length
      ? stage.filters
      : null;
    pointsCloud.filterPointsCloud(filters);
  }

  #filterCondition(stageIndex, groupIndex, conditionIndex) {
    const stage = this.tourEditor && this.tourEditor.stages[stageIndex];
    const group = stage && stage.filters && stage.filters[groupIndex];
    if (!Array.isArray(group)) return null;
    const condition = group[conditionIndex];
    if (!Array.isArray(condition)) return null;
    return condition;
  }

  #attributeRange(attr) {
    const pointsCloud = this.world3d.pointsCloud;
    const cloudData = pointsCloud && pointsCloud.cloudData;
    if (!cloudData) return null;

    if (attr == 'key') {
      return HUDTourBuilderPanel.#finiteRange(cloudData.minH, cloudData.maxH);
    }

    const axes = {
      x: ['minX', 'maxX', 'scaleX'],
      y: ['minY', 'maxY', 'scaleY'],
      z: ['minZ', 'maxZ', 'scaleZ']
    };
    const axis = axes[attr];
    if (!axis) return null;
    let min = cloudData[axis[0]];
    let max = cloudData[axis[1]];
    if (cloudData[axis[2]] == SCALE_LOG) {
      min = 10 ** min;
      max = 10 ** max;
    }
    return HUDTourBuilderPanel.#finiteRange(min, max);
  }

  #rangeError() {
    this.hud.leftScreen.displayMessage(
      'TOUR BUILDER',
      'The data range is not available.',
      ''
    );
  }

  #positionError() {
    this.hud.leftScreen.displayMessage(
      'TOUR BUILDER',
      'The current position could not be read.',
      ''
    );
  }

  static #finiteRange(min, max) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return null;
    return [min, max];
  }

  #syncLayers() {
    this.traverse((obj) => {
      let shown = true;
      let node = obj;
      while (node) {
        if (!node.visible) {
          shown = false;
          break;
        }
        if (node === this) break;
        node = node.parent;
      }
      obj.layers.set(shown ? 0 : 1);
    });
  }

  /*
   * Descriptor coordinates of a point 50000 units in front of the camera rig.
   * The camera looks down local -Z. The value is stored in the tour coordinate
   * system, the same space as stage coords.
   */
  #initialPosInFrontOfCamera() {
    const rig = this.world3d.camera.parent;
    rig.updateMatrixWorld(true);
    const worldPoint = new Vector3(0, 0, -50000);
    rig.localToWorld(worldPoint);

    const pointsCloud = this.world3d.pointsCloud;
    if (!pointsCloud) return null;
    const world = [worldPoint.x, worldPoint.y, worldPoint.z];
    if (this.tourEditor.coordsType == TourEditor.COORD_HEIGHT) {
      return pointsCloud.coords3dToHeight(world);
    }
    return pointsCloud.coords3dToRawData(world);
  }

  static #poseVector(value) {
    if (!Array.isArray(value) || value.length < 3) return null;
    const vector = [Number(value[0]), Number(value[1]), Number(value[2])];
    if (vector.some((component) => !Number.isFinite(component))) return null;
    return vector;
  }

  static exportFileName(sceneParams) {
    const tour = sceneParams && sceneParams.tour;
    if (tour) {
      const clean = String(tour).split('?')[0].split('#')[0];
      const base = clean.split('/').pop();
      if (base) return base;
    }
    const name = (sceneParams && sceneParams.name)
      ? sceneParams.name
      : 'scene';
    const safe = name.replace(/[^a-zA-Z0-9_-]+/g, '_');
    return `tour_${safe}.json`;
  }

  /*
   * Dispose the object
   */
  dispose() {
    this.keyboard.dispose();
    this.screen.dispose();
    this.filterScreen.dispose();
    this.menu.dispose();
    this.world3d = null;
    this.hud = null;
    this.screen = null;
    this.filterScreen = null;
    this.menu = null;
    this.keyboard = null;
    this.tourEditor = null;
    this.#sceneParams = null;
    this.#pendingPosition = null;
    this.#filterStageIndex = null;
  }

}

export { HUDTourBuilderPanel };
