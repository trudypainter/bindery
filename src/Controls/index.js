import h from 'hyperscript';
import { convertStrToPx } from '../utils/convertUnits';
import c from '../utils/prefixClass';

import {
  title,
  select,
  option,
  btn,
  btnMain,
  switchRow,
  row,
  viewMode,
  expandRow,
  expandArea,
  inputNumberUnits,
} from './components';

class ControlPanel {
  constructor(opts) {
    this.binder = opts.binder;
    const viewer = opts.viewer;

    const done = () => {
      this.binder.cancel();
    };
    const print = () => {
      viewer.setPrint();
      window.print();
    };

    const printBtn = btnMain({ onclick: print }, 'Print');

    let layoutControl;
    let cropToggle;
    let bleedMarkToggle;
    let facingToggle;

    const toggleCrop = () => {
      viewer.isShowingCropMarks = !viewer.isShowingCropMarks;
      cropToggle.classList.toggle('selected');
    };

    const toggleBleedMarks = () => {
      viewer.isShowingBleedMarks = !viewer.isShowingBleedMarks;
      bleedMarkToggle.classList.toggle('selected');
    };

    const toggleFacing = () => {
      facingToggle.classList.toggle('selected');
      layoutControl.classList.toggle('not-facing');
      viewer.toggleDouble();
    };

    cropToggle = switchRow({ onclick: toggleCrop }, 'Crop Marks');
    cropToggle.classList.add('selected');
    bleedMarkToggle = switchRow({ onclick: toggleBleedMarks }, 'Bleed Marks');
    facingToggle = switchRow({ onclick: toggleFacing }, 'Facing Pages');

    facingToggle.classList.add('selected');

    let doneBtn = '';
    if (!this.binder.autorun) {
      doneBtn = btn({ onclick: done }, 'Done');
    }

    const unitInputs = {
      top: inputNumberUnits(this.binder.styler.margin.top),
      inner: inputNumberUnits(this.binder.styler.margin.inner),
      outer: inputNumberUnits(this.binder.styler.margin.outer),
      bottom: inputNumberUnits(this.binder.styler.margin.bottom),
      width: inputNumberUnits(this.binder.styler.size.width),
      height: inputNumberUnits(this.binder.styler.size.height),
      bleed: inputNumberUnits(this.binder.styler.bleed),
    };

    const sizeControl = h(`.${c('row')}.${c('size')}`,
      h('div', 'W', unitInputs.width),
      h('div', 'H', unitInputs.height),
    );

    const marginPreview = h(c('.preview'));
    const marginControl = h(`.${c('row')}.${c('margin')}`,
      h('.top', unitInputs.top),
      h('.inner', unitInputs.inner),
      h('.outer', unitInputs.outer),
      h('.bottom', unitInputs.bottom),
      marginPreview,
    );

    layoutControl = h(c('.layout-control'),
      sizeControl,
      marginControl
    );

    const bleedAmount = row('Bleed Amount', unitInputs.bleed);


    const paperSize = row('Paper Size', select(
      option('Letter'),
      option({ disabled: true }, '8.5 x 11'),
      option({ disabled: true }, ''),
      option({ disabled: true }, 'Legal'),
      option({ disabled: true }, '8.5 x 14'),
      option({ disabled: true }, ''),
      option({ disabled: true }, 'Tabloid'),
      option({ disabled: true }, '11 x 17'),
      option({ disabled: true }, ''),
      option({ disabled: true }, 'A4'),
      option({ disabled: true }, 'mm x mm'),
    ));

    const arrangeSelect = select(
      option({ value: 'arrange_one' }, 'Pages'),
      option({ value: 'arrange_two', selected: true }, 'Spreads'),
      option({ value: 'arrange_booklet' }, 'Booklet'),
      option({ disabled: true }, 'Grid'),
      option({ disabled: true }, 'Signatures'),
    );
    arrangeSelect.addEventListener('change', () => {
      viewer.setPrintArrange(arrangeSelect.value);
    });
    const arrangement = row('Print', arrangeSelect);

    const orientationSelect = select(
      option({ value: 'landscape' }, 'Landscape'),
      option({ value: 'portrait' }, 'Portrait'),
    );
    orientationSelect.addEventListener('change', () => {
      viewer.setOrientation(orientationSelect.value);
    });
    const orientation = row('Orientation', orientationSelect);

    const validCheck = h('div', { style: {
      display: 'none',
      color: '#e2b200',
    } }, 'Too Small');
    let inProgress = btn({ style: {
      display: 'none',
    } }, 'Updating...');
    const forceRefresh = btn({ onclick: () => {
      inProgress.style.display = 'block';
      forceRefresh.style.display = 'none';
      setTimeout(() => {
        this.binder.makeBook(() => {
          inProgress.style.display = 'none';
          forceRefresh.style.display = 'block';
        }, 10);
      });
    } }, 'Rebuild Layout');

    const viewModes = [
      viewMode('grid', viewer.setGrid, 'Preview'),
      viewMode('outline', viewer.setOutline, 'Outline'),
      viewMode('flip', viewer.setFlip, 'Flip'),
      viewMode('print', viewer.setPrint, 'Sheet'),
    ];

    const viewSwitcher = h(c('.viewswitcher'), ...viewModes);

    const header = title('Loading...');

    const updateLayoutPreview = (newSize, newMargin) => {
      const px = {
        top: convertStrToPx(newMargin.top),
        inner: convertStrToPx(newMargin.inner),
        outer: convertStrToPx(newMargin.outer),
        bottom: convertStrToPx(newMargin.bottom),
        width: convertStrToPx(newSize.width),
        height: convertStrToPx(newSize.height),
      };

      const BASE = 90;
      let ratio = px.width / px.height;
      ratio = Math.max(ratio, 0.6);
      ratio = Math.min(ratio, 1.8);

      let width;
      let height;
      if (ratio > 2) {
        width = BASE * ratio;
        height = BASE;
      } else {
        width = BASE;
        height = (BASE * 1) / ratio;
      }

      const t = (px.top / px.height) * height;
      const b = (px.bottom / px.height) * height;
      const o = (px.outer / px.width) * width;
      const i = (px.inner / px.width) * width;

      sizeControl.style.width = `${width}px`;
      sizeControl.style.height = `${height}px`;
      marginControl.style.width = `${width}px`;
      marginControl.style.height = `${height}px`;

      marginPreview.style.top = `${t}px`;
      marginPreview.style.bottom = `${b}px`;
      marginPreview.style.left = `${i}px`;
      marginPreview.style.right = `${o}px`;
    };
    updateLayoutPreview(this.binder.styler.size, this.binder.styler.margin);

    this.setInProgress = () => {
      header.innerText = 'Paginating...';
      validCheck.style.display = 'none';
      inProgress.style.display = 'block';
      forceRefresh.style.display = 'none';
    };

    this.updateProgress = (count) => {
      header.innerText = `${count} Pages...`;
    };

    this.setDone = () => {
      header.innerText = `${viewer.book.pages.length} Pages`;
      inProgress.style.display = 'none';
      forceRefresh.style.display = 'block';
      validCheck.style.display = 'none';
    };

    this.setInvalid = () => {
      validCheck.style.display = 'block';
      forceRefresh.style.display = 'block';
      inProgress.style.display = 'none';
    };

    const updateLayout = () => {
      const newMargin = {
        top: unitInputs.top.value,
        inner: unitInputs.inner.value,
        outer: unitInputs.outer.value,
        bottom: unitInputs.bottom.value,
      };
      const newSize = {
        height: unitInputs.height.value,
        width: unitInputs.width.value,
      };
      const newBleed = unitInputs.bleed.value;

      const needsUpdate =
        Object.keys(newMargin).some(k => this.binder.styler.margin[k] !== newMargin[k])
        || Object.keys(newSize).some(k => this.binder.styler.size[k] !== newSize[k])
        || this.binder.bleed !== newBleed;

      if (needsUpdate && this.binder.autoupdate) {
        updateLayoutPreview(newSize, newMargin);
        this.binder.styler.setSize(newSize);
        this.binder.styler.setMargin(newMargin);
        this.binder.styler.setBleed(newBleed);

        if (this.binder.styler.isSizeValid()) {
          this.binder.makeBook();
        } else {
          this.setInvalid();
        }
      }
    };

    let updateDelay;
    const throttledUpdate = () => {
      clearTimeout(updateDelay);
      updateDelay = setTimeout(updateLayout, 700);
    };

    Object.keys(unitInputs).forEach((k) => {
      unitInputs[k].addEventListener('change', throttledUpdate);
      unitInputs[k].addEventListener('keyup', throttledUpdate);
    });

    let playSlow;
    let steps;
    const pause = btn('⏸ Pause', { onclick: () => {
      pause.style.display = 'none';
      playSlow.style.display = 'block';
      steps.style.display = 'block';
    } });
    playSlow = btn('🐌 Resume', { onclick: () => {
      playSlow.style.display = 'none';
      pause.style.display = 'block';
      steps.style.display = 'none';
    } });
    const step = btn('Step +1', { onclick: () => {
    } });
    const step10 = btn('+10', { onclick: () => {
    } });
    const step100 = btn('+100', { onclick: () => {
    } });
    steps = h('div',
      { style: { display: 'none' } },
      step, step10, step100
    );


    const debugControls = row(
      pause,
      playSlow,
      steps
    );
    debugControls.classList.add(c('debug-controls'));
    printBtn.classList.add(c('btn-print'));

    inProgress = debugControls;

    const layoutState = h('div',
      forceRefresh,
      validCheck,
      inProgress,
    );

    let debugToggle;
    const toggleDebug = () => {
      debugToggle.classList.toggle('selected');
      this.binder.debug = !this.binder.debug;
    };
    debugToggle = switchRow({ onclick: toggleDebug }, 'Debug');
    if (this.binder.debug) debugToggle.classList.add('selected');

    this.element = h(c('.controls'),
      header,
      arrangement,
      paperSize,
      orientation,

      expandRow('Print Marks'),
      expandArea(
        cropToggle,
        bleedMarkToggle,
      ),

      expandRow('Book Setup'),
      expandArea(
        layoutControl,
        bleedAmount,
        debugToggle,
        row(layoutState),
      ),

      debugControls,
      row(doneBtn, printBtn),
      viewSwitcher,
    );
  }

}

export default ControlPanel;
