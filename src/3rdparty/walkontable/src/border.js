import {
  addClass,
  hasClass,
  removeClass,
  getComputedStyle,
  getTrimmingContainer,
  innerWidth,
  innerHeight,
  offset,
  outerHeight,
  outerWidth,
} from './../../../helpers/dom/element';
import { stopImmediatePropagation } from './../../../helpers/dom/event';
import { isMobileBrowser } from './../../../helpers/browser';
import EventManager from './../../../eventManager';
import CellCoords from './cell/coords';

const cornerDefaultStyle = {
  width: '6px',
  height: '6px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#FFF'
};
const defaultBorder = {
  width: 1,
  color: '#000',
};

/**
 *
 */
class Border {
  /**
   * @param {Walkontable} wotInstance
   * @param {Object} settings
   */
  constructor(wotInstance, settings) {
    //console.count("border constructor");
    //console.log("border wotInstance:", wotInstance.guid, settings.className);
    if (!settings) {
      return;
    }
    var that = this;
    if (!settings.className) {
      this.isCustom = true;
    }
    this.appearCalls = 0;
    this.abandonedAppearCalls = 0;
    this.abandonedAppearCalls2 = 0;
    this.appearedLeft = 0;
    this.disappearCalls = 0;
    setTimeout(() => {
      if (!settings.className && that.left === null) {
        //console.log("Border", that.left, that);

      }
    }, 2000);
    this.eventManager = new EventManager(wotInstance);
    this.wot = wotInstance;
    this.settings = settings;
    this.mouseDown = false;

    this.bordersHolder = this.wot.wtTable.bordersHolder;

    if (!this.bordersHolder) {
      this.bordersHolder = this.wot.rootDocument.createElement('div');
      this.bordersHolder.className = 'htBorders';
      this.wot.wtTable.bordersHolder = this.bordersHolder;
      this.wot.wtTable.spreader.appendChild(this.bordersHolder);
    }

    this.top = null;
    this.left = null;
    this.bottom = null;
    this.right = null;

    this.topStyle = null;
    this.leftStyle = null;
    this.bottomStyle = null;
    this.rightStyle = null;

    this.corner = null;
    this.cornerStyle = null;

    this.selectionHandles = {
      styles: {}
    };

    this.registerListeners();
  }

  /**
   * Perform a callback for all DOM elements
   * @param {Function} callback Function to perform for all elements, with that element as the argument
   */
  forAllDomElements(callback) {
    if(this.top){
      callback(this.top);
    }
    if(this.left){
      callback(this.left);
    }
    if(this.bottom){
      callback(this.bottom);
    }
    if(this.right){
      callback(this.right);
    }
    if(this.corner){
      callback(this.corner);
    }
    if (this.selectionHandles.topLeft) {
      callback(this.selectionHandles.topLeft);
      callback(this.selectionHandles.bottomRight);
      callback(this.selectionHandles.topLeftHitArea);
      callback(this.selectionHandles.bottomRightHitArea);
    }
  }

  /**
   * Register all necessary events
   */
  registerListeners() {
    const documentBody = this.wot.rootDocument.body;

    this.eventManager.addEventListener(documentBody, 'mousedown', () => this.onMouseDown());
    this.eventManager.addEventListener(documentBody, 'mouseup', () => this.onMouseUp());
  }

  /**
   * Mouse down listener
   *
   * @private
   */
  onMouseDown() {
    this.mouseDown = true;
  }

  /**
   * Mouse up listener
   *
   * @private
   */
  onMouseUp() {
    this.mouseDown = false;
  }

  /**
   * Mouse enter listener for fragment selection functionality.
   *
   * @private
   * @param {Event} event Dom event
   * @param {HTMLElement} parentElement Part of border element.
   */
  onMouseEnter(event, parentElement) {
    if (!this.mouseDown || !this.wot.getSetting('hideBorderOnMouseDownOver')) {
      return;
    }
    event.preventDefault();
    stopImmediatePropagation(event);

    const _this = this;
    const documentBody = this.wot.rootDocument.body;
    const bounds = parentElement.getBoundingClientRect();
    // Hide border to prevents selection jumping when fragmentSelection is enabled.
    parentElement.style.display = 'none';

    function isOutside(mouseEvent) {
      if (mouseEvent.clientY < Math.floor(bounds.top)) {
        return true;
      }
      if (mouseEvent.clientY > Math.ceil(bounds.top + bounds.height)) {
        return true;
      }
      if (mouseEvent.clientX < Math.floor(bounds.left)) {
        return true;
      }
      if (mouseEvent.clientX > Math.ceil(bounds.left + bounds.width)) {
        return true;
      }
    }

    function handler(handlerEvent) {
      if (isOutside(handlerEvent)) {
        _this.eventManager.removeEventListener(documentBody, 'mousemove', handler);
        parentElement.style.display = 'block';
      }
    }

    this.eventManager.addEventListener(documentBody, 'mousemove', handler);
  }

  /**
   * Create border elements
   *
   * @param {Object} settings
   */
  createBorder(position) {
      const div = this.wot.rootDocument.createElement('div');

      div.className = `wtBorder ${this.settings.className || ''}`; // + borderDivs[i];

      const style = div.style;
      style.backgroundColor = (this.settings[position] && this.settings[position].color) ? this.settings[position].color : this.settings.border.color;
      style.height = (this.settings[position] && this.settings[position].width) ? `${this.settings[position].width}px` : `${this.settings.border.width}px`;
      style.width = (this.settings[position] && this.settings[position].width) ? `${this.settings[position].width}px` : `${this.settings.border.width}px`;

      this.bordersHolder.appendChild(div);
      this[position] = div;
      this[`${position}Style`] = style;
    
      if (position === 'corner') {
        div.className += ' corner';
        style.width = cornerDefaultStyle.width;
        style.height = cornerDefaultStyle.height;
        style.border = [
          cornerDefaultStyle.borderWidth,
          cornerDefaultStyle.borderStyle,
          cornerDefaultStyle.borderColor
        ].join(' ');
      }

      this.eventManager.addEventListener(div, 'mouseenter', event => this.onMouseEnter(event, div));
  }

  /**
   * Create multiple selector handler for mobile devices
   */
  createMultipleSelectorHandles(position) {
    const positionHitArea = `${position}HitArea`;

    const div = this.wot.rootDocument.createElement('DIV');
    this.selectionHandles[position] = div;
    const divHitArea = this.wot.rootDocument.createElement('DIV');
    this.selectionHandles[positionHitArea] = divHitArea;

    const width = 10;
    const hitAreaWidth = 40;

    div.className = `${position}SelectionHandle`;
    divHitArea.className = `${position}SelectionHandle-HitArea`;

    this.selectionHandles.styles[position] = div.style;
    this.selectionHandles.styles[positionHitArea] = divHitArea.style;

    Object.assign(divHitArea.style, {
      position: 'absolute',
      height: `${hitAreaWidth}px`,
      width: `${hitAreaWidth}px`,
      'border-radius': `${parseInt(hitAreaWidth / 1.5, 10)}px`,
    });

    Object.assign(div.style, {
      position: 'absolute',
      height: `${width}px`,
      width: `${width}px`,
      'border-radius': `${parseInt(width / 1.5, 10)}px`,
      background: '#F5F5FF',
      border: '1px solid #4285c8'
    });

    this.bordersHolder.appendChild(div);
    this.bordersHolder.appendChild(divHitArea);

    this.eventManager.addEventListener(div, 'mouseenter', event => this.onMouseEnter(event, div));
    this.eventManager.addEventListener(divHitArea, 'mouseenter', event => this.onMouseEnter(event, divHitArea));
  }

  isPartRange(row, col) {
    const areaSelection = this.wot.selections.createOrGetArea();

    if (areaSelection.cellRange) {
      if (row !== areaSelection.cellRange.to.row || col !== areaSelection.cellRange.to.col) {
        return true;
      }
    }

    return false;
  }

  updateMultipleSelectionHandlesPosition(row, col, top, left, width, height) {
    const handleWidth = parseInt(this.selectionHandles.styles.topLeft.width, 10);
    const hitAreaWidth = parseInt(this.selectionHandles.styles.topLeftHitArea.width, 10);

    this.selectionHandles.styles.topLeft.top = `${parseInt(top - handleWidth, 10)}px`;
    this.selectionHandles.styles.topLeft.left = `${parseInt(left - handleWidth, 10)}px`;

    this.selectionHandles.styles.topLeftHitArea.top = `${parseInt(top - ((hitAreaWidth / 4) * 3), 10)}px`;
    this.selectionHandles.styles.topLeftHitArea.left = `${parseInt(left - ((hitAreaWidth / 4) * 3), 10)}px`;

    this.selectionHandles.styles.bottomRight.top = `${parseInt(top + height, 10)}px`;
    this.selectionHandles.styles.bottomRight.left = `${parseInt(left + width, 10)}px`;

    this.selectionHandles.styles.bottomRightHitArea.top = `${parseInt(top + height - (hitAreaWidth / 4), 10)}px`;
    this.selectionHandles.styles.bottomRightHitArea.left = `${parseInt(left + width - (hitAreaWidth / 4), 10)}px`;

    if (this.settings.border.cornerVisible && this.settings.border.cornerVisible()) {
      this.selectionHandles.styles.topLeft.display = 'block';
      this.selectionHandles.styles.topLeftHitArea.display = 'block';

      if (this.isPartRange(row, col)) {
        this.selectionHandles.styles.bottomRight.display = 'none';
        this.selectionHandles.styles.bottomRightHitArea.display = 'none';
      } else {
        this.selectionHandles.styles.bottomRight.display = 'block';
        this.selectionHandles.styles.bottomRightHitArea.display = 'block';
      }
    } else {
      this.selectionHandles.styles.topLeft.display = 'none';
      this.selectionHandles.styles.bottomRight.display = 'none';
      this.selectionHandles.styles.topLeftHitArea.display = 'none';
      this.selectionHandles.styles.bottomRightHitArea.display = 'none';
    }

    if (row === this.wot.wtSettings.getSetting('fixedRowsTop') || col === this.wot.wtSettings.getSetting('fixedColumnsLeft')) {
      this.selectionHandles.styles.topLeft.zIndex = '9999';
      this.selectionHandles.styles.topLeftHitArea.zIndex = '9999';
    } else {
      this.selectionHandles.styles.topLeft.zIndex = '';
      this.selectionHandles.styles.topLeftHitArea.zIndex = '';
    }
  }

  /**
   * Show border around one or many cells
   *
   * @param {Array} corners
   */
  appear(corners) {
    this.appearCalls++;
    if (this.disabled) {
      throw new Error("this is never executed");


      this.abandonedAppearCalls++;
      return;
    }

    const { wtTable, rootWindow } = this.wot;
    let fromRow;
    let toRow;
    let fromColumn;
    let toColumn;

    const rowsCount = wtTable.getRenderedRowsCount();

    for (let i = 0; i < rowsCount; i += 1) {
      const s = wtTable.rowFilter.renderedToSource(i);

      if (s >= corners[0] && s <= corners[2]) {
        fromRow = s;
        break;
      }
    }

    for (let i = rowsCount - 1; i >= 0; i -= 1) {
      const s = wtTable.rowFilter.renderedToSource(i);

      if (s >= corners[0] && s <= corners[2]) {
        toRow = s;
        break;
      }
    }

    const columnsCount = wtTable.getRenderedColumnsCount();

    for (let i = 0; i < columnsCount; i += 1) {
      const s = wtTable.columnFilter.renderedToSource(i);

      if (s >= corners[1] && s <= corners[3]) {
        fromColumn = s;
        break;
      }
    }

    for (let i = columnsCount - 1; i >= 0; i -= 1) {
      const s = wtTable.columnFilter.renderedToSource(i);

      if (s >= corners[1] && s <= corners[3]) {
        toColumn = s;
        break;
      }
    }
    if (fromRow === void 0 || fromColumn === void 0) {
      debugger;
      this.abandonedAppearCalls2++;
      this.disappear();

      return;
    }
    let fromTD = wtTable.getCell(new CellCoords(fromRow, fromColumn));
    const isMultiple = (fromRow !== toRow || fromColumn !== toColumn);
    const toTD = isMultiple ? wtTable.getCell(new CellCoords(toRow, toColumn)) : fromTD;
    const fromOffset = offset(fromTD);
    const toOffset = isMultiple ? offset(toTD) : fromOffset;
    const containerOffset = offset(wtTable.TABLE);
    const minTop = fromOffset.top;
    const minLeft = fromOffset.left;

    let left = minLeft - containerOffset.left - 1;
    let width = toOffset.left + outerWidth(toTD) - minLeft;

    if (this.isEntireColumnSelected(fromRow, toRow)) {
      const modifiedValues = this.getDimensionsFromHeader('columns', fromColumn, toColumn, containerOffset);
      let fromTH = null;

      if (modifiedValues) {
        [fromTH, left, width] = modifiedValues;
      }

      if (fromTH) {
        fromTD = fromTH;
      }
    }

    let top = minTop - containerOffset.top - 1;
    let height = toOffset.top + outerHeight(toTD) - minTop;

    if (this.isEntireRowSelected(fromColumn, toColumn)) {
      const modifiedValues = this.getDimensionsFromHeader('rows', fromRow, toRow, containerOffset);
      let fromTH = null;

      if (modifiedValues) {
        [fromTH, top, height] = modifiedValues;
      }

      if (fromTH) {
        fromTD = fromTH;
      }
    }

    const style = getComputedStyle(fromTD, rootWindow);

    if (parseInt(style.borderTopWidth, 10) > 0) {
      top += 1;
      height = height > 0 ? height - 1 : 0;
    }
    if (parseInt(style.borderLeftWidth, 10) > 0) {
      left += 1;
      width = width > 0 ? width - 1 : 0;
    }

    if(this.shouldBorderBeRenderedAtPositon('top')) {
      this.ensureBorderAtPosition('top');
      this.topStyle.top = `${top}px`;
      this.topStyle.left = `${left}px`;
      this.topStyle.width = `${width}px`;
      this.topStyle.display = 'block';
    }

    if(this.shouldBorderBeRenderedAtPositon('left')) {
      this.appearedLeft++;
      this.ensureBorderAtPosition('left');
      this.leftStyle.top = `${top}px`;
      this.leftStyle.left = `${left}px`;
      this.leftStyle.height = `${height}px`;
      this.leftStyle.display = 'block';
    }
    else if (this.isCustom) {
      //console.log("is custom, why not left?");
      this.shouldBorderBeRenderedAtPositon('left');
    }

    const delta = Math.floor(this.settings.border.width / 2);

    if(this.shouldBorderBeRenderedAtPositon('bottom')) {
      this.ensureBorderAtPosition('bottom');
      this.bottomStyle.top = `${top + height - delta}px`;
      this.bottomStyle.left = `${left}px`;
      this.bottomStyle.width = `${width}px`;
      this.bottomStyle.display = 'block';
    }

    if(this.shouldBorderBeRenderedAtPositon('right')) {
      this.ensureBorderAtPosition('right');
      this.rightStyle.top = `${top}px`;
      this.rightStyle.left = `${left + width - delta}px`;
      this.rightStyle.height = `${height + 1}px`;
      this.rightStyle.display = 'block';
    }

    if(this.shouldBorderBeRenderedAtPositon('corner')) {
      this.ensureBorderAtPosition('corner');
      
      const hookResult = this.wot.getSetting('onModifyGetCellCoords', toRow, toColumn);
      let [checkRow, checkCol] = [toRow, toColumn];
  
      if (hookResult && Array.isArray(hookResult)) {
        [,, checkRow, checkCol] = hookResult;
      }

      //what if `cornerVisibleSetting` changed between appears? to repro: drag handle one cell down, release
      if (isMobileBrowser() || this.isPartRange(checkRow, checkCol)) {
        this.cornerStyle.display = 'none';
  
      } else {
        this.cornerStyle.top = `${top + height - 4}px`;
        this.cornerStyle.left = `${left + width - 4}px`;
        this.cornerStyle.borderRightWidth = cornerDefaultStyle.borderWidth;
        this.cornerStyle.width = cornerDefaultStyle.width;
  
        // Hide the fill handle, so the possible further adjustments won't force unneeded scrollbars.
        this.cornerStyle.display = 'none';
  
        let trimmingContainer = getTrimmingContainer(wtTable.TABLE);
        const trimToWindow = trimmingContainer === rootWindow;
  
        if (trimToWindow) {
          trimmingContainer = this.wot.rootDocument.documentElement;
        }
  
        if (toColumn === this.wot.getSetting('totalColumns') - 1) {
          const toTdOffsetLeft = trimToWindow ? toTD.getBoundingClientRect().left : toTD.offsetLeft;
          const cornerRightEdge = toTdOffsetLeft + outerWidth(toTD) + (parseInt(cornerDefaultStyle.width, 10) / 2);
          const cornerOverlappingContainer = cornerRightEdge >= innerWidth(trimmingContainer);
  
          if (cornerOverlappingContainer) {
            this.cornerStyle.left = `${Math.floor(left + width - 3 - (parseInt(cornerDefaultStyle.width, 10) / 2))}px`;
            this.cornerStyle.borderRightWidth = 0;
          }
        }
  
        if (toRow === this.wot.getSetting('totalRows') - 1) {
          const toTdOffsetTop = trimToWindow ? toTD.getBoundingClientRect().top : toTD.offsetTop;
          const cornerBottomEdge = toTdOffsetTop + outerHeight(toTD) + (parseInt(cornerDefaultStyle.height, 10) / 2);
          const cornerOverlappingContainer = cornerBottomEdge >= innerHeight(trimmingContainer);
  
          if (cornerOverlappingContainer) {
            this.cornerStyle.top = `${Math.floor(top + height - 3 - (parseInt(cornerDefaultStyle.height, 10) / 2))}px`;
            this.cornerStyle.borderBottomWidth = 0;
          }
        }
  
        this.cornerStyle.display = 'block';
      }
    }

    if (isMobileBrowser()) {
      this.updateMultipleSelectionHandlesPosition(toRow, toColumn, top, left, width, height);
    }
  }

  shouldBorderBeRenderedAtPositon(position) {
    if (position === 'corner') {
      let cornerVisibleSetting = this.settings.border.cornerVisible;
      cornerVisibleSetting = typeof cornerVisibleSetting === 'function' ? cornerVisibleSetting(this.settings.layerLevel) : cornerVisibleSetting;
      return cornerVisibleSetting;
    }
    return !((this.settings[position] && this.settings[position].hide) ? this.settings[position].hide : this.settings.border.hide);
  }

  ensureBorderAtPosition(position) {
    if (!this[position]) {
      this.createBorder(position);
    }
  }

  /**
   * Check whether an entire column of cells is selected.
   *
   * @private
   * @param {Number} startRowIndex Start row index.
   * @param {Number} endRowIndex End row index.
   */
  isEntireColumnSelected(startRowIndex, endRowIndex) {
    return startRowIndex === this.wot.wtTable.getFirstRenderedRow() && endRowIndex === this.wot.wtTable.getLastRenderedRow();
  }

  /**
   * Check whether an entire row of cells is selected.
   *
   * @private
   * @param {Number} startColumnIndex Start column index.
   * @param {Number} endColumnIndex End column index.
   */
  isEntireRowSelected(startColumnIndex, endColumnIndex) {
    return startColumnIndex === this.wot.wtTable.getFirstRenderedColumn() && endColumnIndex === this.wot.wtTable.getLastRenderedColumn();
  }

  /**
   * Get left/top index and width/height depending on the `direction` provided.
   *
   * @private
   * @param {String} direction `rows` or `columns`, defines if an entire column or row is selected.
   * @param {Number} fromIndex Start index of the selection.
   * @param {Number} toIndex End index of the selection.
   * @param {Number} containerOffset offset of the container.
   * @return {Array|Boolean} Returns an array of [headerElement, left, width] or [headerElement, top, height], depending on `direction` (`false` in case of an error getting the headers).
   */
  getDimensionsFromHeader(direction, fromIndex, toIndex, containerOffset) {
    const { wtTable } = this.wot;
    const rootHotElement = wtTable.wtRootElement.parentNode;
    let getHeaderFn = null;
    let dimensionFn = null;
    let entireSelectionClassname = null;
    let index = null;
    let dimension = null;
    let dimensionProperty = null;
    let startHeader = null;
    let endHeader = null;

    switch (direction) {
      case 'rows':
        getHeaderFn = (...args) => wtTable.getRowHeader(...args);
        dimensionFn = (...args) => outerHeight(...args);
        entireSelectionClassname = 'ht__selection--rows';
        dimensionProperty = 'top';

        break;

      case 'columns':
        getHeaderFn = (...args) => wtTable.getColumnHeader(...args);
        dimensionFn = (...args) => outerWidth(...args);
        entireSelectionClassname = 'ht__selection--columns';
        dimensionProperty = 'left';
        break;
      default:
    }

    if (rootHotElement.className.includes(entireSelectionClassname)) {
      const columnHeaderLevelCount = this.wot.getSetting('columnHeaders').length;

      startHeader = getHeaderFn(fromIndex, columnHeaderLevelCount - 1);
      endHeader = getHeaderFn(toIndex, columnHeaderLevelCount - 1);

      if (!startHeader || !endHeader) {
        return false;
      }

      const startHeaderOffset = offset(startHeader);
      const endOffset = offset(endHeader);

      if (startHeader && endHeader) {
        index = startHeaderOffset[dimensionProperty] - containerOffset[dimensionProperty] - 1;
        dimension = endOffset[dimensionProperty] + dimensionFn(endHeader) - startHeaderOffset[dimensionProperty];
      }

      return [startHeader, index, dimension];
    }

    return false;
  }

  /**
   * Change border style.
   *
   * @private
   * @param {String} borderElement Coordinate where add/remove border: top, right, bottom, left.
   */
  changeBorderStyle(borderElement, border) {
    const borderStyle = border[borderElement];

    if (!borderStyle || borderStyle.hide) {
      if (this[borderElement]) {
        addClass(this[borderElement], 'hidden');
      }
    } else {
      if (!this[borderElement]) {
        this.createBorder(borderElement);
      }
      else {
        if (hasClass(this[borderElement], 'hidden')) {
          removeClass(this[borderElement], 'hidden');
        }
        const style = this[borderElement].style;
        style.backgroundColor = borderStyle.color;
  
        if (borderElement === 'top' || borderElement === 'bottom') {
          style.height = `${borderStyle.width}px`;
        }
  
        if (borderElement === 'right' || borderElement === 'left') {
          style.width = `${borderStyle.width}px`;
        }
      }
    }
  }

  /**
   * Change border style to default.
   *
   * @private
   * @param {HTMLElement} position
   */
  changeBorderToDefaultStyle(position) {
    const style = this[position].style;
    style.backgroundColor = defaultBorder.color;
    style.width = `${defaultBorder.width}px`;
    style.height = `${defaultBorder.width}px`;
  }

  /**
   * Toggle class 'hidden' to element.
   *
   * @private
   * @param {String} borderElement Coordinate where add/remove border: top, right, bottom, left.
   * @return {Boolean}
   */
  toggleHiddenClass(borderElement, remove) {
    this.changeBorderToDefaultStyle(borderElement);

    if (remove) {
      addClass(this[borderElement], 'hidden');
    } else {
      removeClass(this[borderElement], 'hidden');
    }
  }

  /**
   * Hide border
   */
  disappear() {
    this.disappearCalls++;
    if (this.topStyle) {
      this.topStyle.display = 'none';
    }
    if (this.leftStyle) {
      this.leftStyle.display = 'none';
    }
    if (this.bottomStyle) {
      this.bottomStyle.display = 'none';
    }
    if (this.rightStyle) {
      this.rightStyle.display = 'none';
    }
    if (this.cornerStyle) {
      this.cornerStyle.display = 'none';
    }

    if (isMobileBrowser()) {
      this.selectionHandles.styles.topLeft.display = 'none';
      this.selectionHandles.styles.bottomRight.display = 'none';
    }
  }

  /**
   * Cleans up all the DOM state related to a Border instance. Call this prior to deleting a Border instance.
   */
  destroy() {
    this.eventManager.destroyWithOwnEventsOnly();
    this.forAllDomElements(elem => elem.parentNode.removeChild(elem));
  }
}

export default Border;
