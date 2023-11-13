import '../scss/style.scss';
import '../scss/right-menu.scss';
import '../scss/menu.scss';
import '../scss/text-menu.scss';
import '../scss/shape-menu.scss';
import '../scss/arrow-menu.scss';
import { fabric } from 'fabric';
import 'fabric-history';
import { elements, shapeFillPicker, shapeMenu, heightValue, widthValue } from './variables';



//^ буфер обмена для copy paste
var _clipboard;
//^ Координаты context меню во время вызова
var contextMenuClick;

var initialPointer;
//^Фигуры для рисования
let text, line, arrow, square, ellipse, rhombus, triangle, targetElem;

//^ Создаём новый канвас fabric
export const canvas = new fabric.Canvas('canvas', {
    width: window.innerWidth,
    // backgroundColor: '#e6f7ea', //'#f5f5f5'
    height: window.innerHeight,
    stateful: true,
    imageSmoothingEnabled: true,
});

let brushSize = parseInt(elements.brush_size_input.value);
let brushColor = elements.brush_picker.color.toHex();


loadListeners();


//&contextMenu 
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    canvas.isDrawingMode = false;

    if (e.target.classList.value != 'upper-canvas canvas') {
        return
    }
    elements.context_menu.style.left = e.clientX + 'px';
    elements.context_menu.style.top = e.clientY + 'px';
    elements.context_menu.classList.toggle('visible');
    contextMenuClick = { x: e.clientX, y: e.clientY };

    var pointer = canvas.getPointer(e); // Получить координаты клика
    var objects = canvas.getObjects(); // Получить все объекты на холсте

    for (var i = 0; i < objects.length; i++) {
        if (objects[i].containsPoint(pointer)) { // Проверить, содержит ли объект точку клика
            targetElem = objects[i];
            console.log(targetElem)
            if (targetElem.type === 'group') {
                var objectsInGroup = targetElem.getObjects();
                console.log(objectsInGroup);
            }
        }
    }
});

//^ Настройки corner (меню управления объектами);
fabric.Object.prototype.transparentCorners = false; //^ Отключает прозрачность углов для всех объектов на холсте
fabric.Object.prototype.cornerColor = '#ffffff'; //^ Устанавливает цвет углов для всех объектов на холсте в синий цвет
fabric.Object.prototype.cornerSize = 10; //^ Устанавливает размер углов для всех объектов на холсте равным 10
fabric.Object.prototype.cornerStyle = 'circle'; //^ Устанавливает стиль углов для всех объектов на холсте в виде круга
fabric.Object.prototype.cornerStrokeColor = "#228eff";
fabric.Object.prototype.borderColor = "#228eff";
fabric.Object.prototype.objectCaching = false;
fabric.ActiveSelection.prototype.cornerColor = '#ffffff';
fabric.ActiveSelection.prototype.padding = 10;
canvas.selectionBorderColor = '#228eff'; //^ цвет selection
canvas.selectionColor = 'transparent';


window.addEventListener('resize', resizeCanvas) //* Resize канвас 
elements.cursor.addEventListener('click', loadListeners); //* Дефолтные обработчики события ZOOM + DRAG
elements.delete_icon.addEventListener('click', deleteObject); //* Удаление выделенных объектов DEL
elements.draw.addEventListener('click', drawBrush)
elements.arrow.addEventListener('click', drawArrow); //* рисуем ->
elements.rect.addEventListener('click', drawRect); //* рисуем ⬜ 
elements.text.addEventListener('click', addText); //* добавляем текст
elements.circle.addEventListener('click', drawCircle); //* рисуем 🔵 
elements.rhombus.addEventListener('click', drawRhombus);//* рисуем 🔹
elements.triangle.addEventListener('click', drawTriangle);
elements.step_back.addEventListener('click', stepBack);
elements.step_forward.addEventListener('click', stepForward);
elements.lock_unlock.addEventListener('click', toggleBlockActiveObject);//* блокировка активного обьекта

elements.group.addEventListener('click', groupObject);
elements.ungroup.addEventListener('click', ungroupObject);
elements.copy.addEventListener('click', cloneObject);
elements.paste.addEventListener('click', pasteObject);
elements.delete.addEventListener('click', deleteObject);
elements.brush_size_input.addEventListener('change', changeSizeBrush);
elements.brush_picker.addEventListener('change', changeColorBrush);
shapeFillPicker.addEventListener('change', changeFill);
elements.arrow_slider.addEventListener('input', changeArrowWidth)

//& размер кисти
function changeSizeBrush() {
    if (canvas.isDrawingMode) {
        canvas.isDrawingMode = false;
        brushSize = parseInt(elements.brush_size_input.value);
        drawBrush();
    } else {
        stopDrawEvent();
        brushSize = parseInt(elements.brush_size_input.value);
    }
}

//& цвет кисти 
function changeColorBrush(e) {
    const color = e.detail.hex8;
    if (canvas.isDrawingMode) {
        canvas.isDrawingMode = false;
        brushColor = color;
        drawBrush();
    } else {
        stopDrawEvent();
        brushColor = color;
    }
}

function changeArrowWidth() {
    const width = elements.arrow_slider.value;
    const objects = canvas.getActiveObjects();

    if (width < 1) {
        return
    }
    // Проходим по каждому объекту
    for (var i = 0; i < objects.length; i++) {
        var object = objects[i];

        // Проверяем, является ли объект стрелкой
        if (object.id === 'single-arrow') {
            // Если да, то меняем масштаб каждого объекта в группе
            object.scaleX = width,
            object.scaleY = width
            canvas.requestRenderAll();
        }
    }

    // Перерисовываем холст, чтобы увидеть изменения
    
}

//& Генерируем фон для канваса
function createSvgBackground() {
    var width = canvas.getWidth();
    var height = canvas.getHeight();
    // Создаем SVG-элемент
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    // Создаем круги
    for (var i = 20; i < width; i += 50) {
        for (var j = 10; j < height; j += 50) {
            var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", i);
            circle.setAttribute("cy", j);
            circle.setAttribute("r", 1);
            circle.setAttribute("opacity", 1)
            circle.setAttribute("fill", "#aaabac");
            circle.setAttribute('imageSmoothing', 'true');
            svg.appendChild(circle);
        }
    }

    // Преобразуем SVG в строку и загружаем его как фон холста
    var svgString = new XMLSerializer().serializeToString(svg);
    var svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svgString);

    // Устанавливаем фоновое изображение с помощью CSS, а не с помощью Fabric.js
    canvas.getElement().style.backgroundImage = 'url(' + svgDataUrl + ')';

}

createSvgBackground();

//& Реагируем на изменение размеров canvas
function resizeCanvas() {
    canvas.setWidth(window.innerWidth);
    canvas.setHeight(window.innerHeight);
    canvas.calcOffset();
    createSvgBackground(canvas);
    canvas.renderAll();
}


function stepBack() {
    canvas.undo();
    // canvas.forEachObject(function(object) {
    //     if (object.type === 'group' || object.type === 'activeSelection') {
    //         object.getObjects().forEach(function(groupObject) {
    //             groupObject.objectCaching = false;
    //         });
    //     } else {
    //         object.objectCaching = false;
    //     }
    // });
    // canvas.renderAll(); // Перерисовываем холст, чтобы увидеть изменения
}

function stepForward() {
    canvas.redo();
}

//& Стандартные обработчики событий
function loadListeners() {
    stopDrawEvent();
    //Перетатаскивание холста
    canvas.on('mouse:down', setDragCanvas);
    //Клик по канвасу со включенным драг режимом
    canvas.on('mouse:move', clickInDragingCanvas);
    canvas.on('mouse:up', mouseUpDragingCanvas);
    canvas.on('mouse:wheel', zoomCanvas);
}

//? Очищаем слушатели
function clearListeners() {
    canvas.off('mouse:wheel');
    canvas.off('mouse:down');
    canvas.off('mouse:move');
}


//& Передивжение холста alt + mouse down DEFAULT MODE
function setDragCanvas(opt) {

    var evt = opt.e;
    if (evt.altKey === true) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
    }
}

//& 
function clickInDragingCanvas(opt) {
    if (this.isDragging) {
        var e = opt.e;
        var vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
    }
}


function mouseUpDragingCanvas(opt) {
    // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
}

//& Zoom canvas
function zoomCanvas(opt) {
    canvas.discardActiveObject();
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.9998 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();

}


let drawMode = false;


function selectionOn() {
    canvas.forEachObject(function (object) {
        object.set('selectable', true);
    });
}

//& Группировка активных обьектов
function groupObject() {
    if (!canvas.getActiveObject()) {
        return;
    }
    if (canvas.getActiveObject().type !== 'activeSelection') {
        return;
    }

    canvas.getActiveObject().toGroup();
    selectionOn();
    canvas.getActiveObject().set('objectCaching', false);
    canvas.renderAll();
}


//& Разгруппировка активных обьектов
function ungroupObject() {
    if (!canvas.getActiveObject()) {
        return;
    }
    if (canvas.getActiveObject().type !== 'group') {
        return;
    }
    canvas.getActiveObject().toActiveSelection();
    canvas.requestRenderAll();
    canvas.discardActiveObject();
}

//& Создаёт копию активного обьекта
function cloneObject() {
    const activObj = canvas.getActiveObject()
    if (activObj) {
        activObj.clone(function (cloned) {
            _clipboard = cloned;
        })
    }
}

//& Вставляем объект через контекстное меню координат контекстного меню
function pasteObject() {
    _clipboard.clone(function (clonedObj) {
        clonedObj.set({
            left: contextMenuClick.x,
            top: contextMenuClick.y,
            evented: true,
            objectCaching: false,
        });
        if (clonedObj.type === 'activeSelection' || clonedObj.type === 'group') {
            clonedObj.canvas = canvas;
            clonedObj.forEachObject(function (obj) {
                obj.set('objectCaching', false); // Установите objectCaching в false для каждого объекта
                canvas.add(obj);
            });
            clonedObj.setCoords();
        } else {
            canvas.add(clonedObj);
        }
        canvas.setActiveObject(clonedObj);
        canvas.requestRenderAll();
    });
}


//& Функция добавляние текста 
function addText() {
    stopDrawEvent(); // Останавливаем все текущие события рисования
    canvas.defaultCursor = 'crosshair'; // Устанавливаем курсор в виде перекрестия
    canvas.on({ // Назначаем обработчики событий мыши для рисования стрелки
        'mouse:down': addingTextMouseDown,
        'mouse:move': drawingTextOnMouseMove,
        'mouse:up': stopDrawingTextOnMouseUp,
    })

}

//& Функция для начала рисования стрелки ->
function drawArrow() {
    stopDrawEvent(); // Останавливаем все текущие события рисования
    canvas.defaultCursor = 'crosshair'; // Устанавливаем курсор в виде перекрестия
    canvas.on({ // Назначаем обработчики событий мыши для рисования стрелки
        'mouse:down': addingArrowMouseDown,
        'mouse:move': drawingArrowOnMouseMove,
        'mouse:up': stopDrawingArrowOnMouseUp,
    })
}

//& Функция для начала рисования прямоугольника + ⬜ 
function drawRect() {
    stopDrawEvent(); // Останавливаем все текущие события рисования
    canvas.defaultCursor = 'crosshair'; // Устанавливаем курсор в виде перекрестия
    canvas.on({ // Назначаем обработчики событий мыши для рисования прямоугольника
        'mouse:down': addingRectMouseDown,
        'mouse:move': drawingRectOnMouseMove,
        'mouse:up': stopDrawingRectOnMouseUp,
    })

}

//& Функция рисования круга  + 🔵 
function drawCircle() {
    stopDrawEvent();
    canvas.defaultCursor = 'crosshair';
    canvas.on({ // Назначаем обработчики событий мыши для рисования круга
        'mouse:down': addingEllipseMouseDown,
        'mouse:move': drawingEllipseOnMouseMove,
        'mouse:up': stopDrawingEllipseOnMouseUp,
    })
}

//& Функция рисования ромба
function drawRhombus() {
    stopDrawEvent();
    canvas.defaultCursor = 'crosshair';
    canvas.on({ // Назначаем обработчики событий мыши для рисования круга
        'mouse:down': addingRhombusMouseDown,
        'mouse:move': drawingRhombusOnMouseMove,
        'mouse:up': stopDrawingRhombusOnMouseUp,
    })
}

//& Функция рисования треугольника
function drawTriangle() {
    stopDrawEvent();
    canvas.defaultCursor = 'crosshair';
    canvas.on({ // Назначаем обработчики событий мыши для рисования круга
        'mouse:down': addingTriangleMouseDown,
        'mouse:move': drawingTriangleOnMouseMove,
        'mouse:up': stopDrawingTriangleOnMouseUp,
    })
}

//& Функция для начала рисования стрелки при нажатии кнопки мыши ->
function addingArrowMouseDown() {
    canvas.selection = false; // Отключаем возможность выделения объектов
    drawMode = true; // Включаем режим рисования
    let pointer = canvas.getPointer(); // Получаем координаты указателя мыши
    let linePath = 'M ' + pointer.x + ' ' + pointer.y + ' L ' + pointer.x + ' ' + pointer.y; // Создаем путь для линии стрелки
    line = new fabric.Path(linePath, { // Создаем линию стрелки
        stroke: 'black',
        strokeWidth: 3,
        strokeLineCap: 'round', // Добавляем скругление к концам линии
        strokeLineJoin: 'round', // Добавляем скругление к соединениям линии
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        objectCaching: false,
    });

    let arrowHeadPath = 'M ' + pointer.x + ' ' + pointer.y + ' L ' + (pointer.x - 10) + ' ' + (pointer.y - 10) + ' M ' + pointer.x + ' ' + pointer.y + ' L ' + (pointer.x + 10) + ' ' + (pointer.y - 10);

    arrow = new fabric.Path(arrowHeadPath, { // Создаем голову стрелки
        label: 'arrow-line',
        fillWidth: 0,
        stroke: 'black',
        strokeWidth: 3,
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        strokeLineCap: 'round', // Добавляем скругление к концам линии
        strokeLineJoin: 'round', // Добавляем скругление к соединениям линии
        top: pointer.y,
        left: pointer.x,
        angle: 180,
        objectCaching: false,
        selectable: false,
    })

    canvas.add(line); // Добавляем линию на холст
    canvas.add(arrow); // Добавляем голову стрелки на холст
}


//& Функция для обновления размеров и положения стрелки при движении мыши ->

function drawingArrowOnMouseMove() {
    if (drawMode === true) { // Если включен режим рисования
        let pointer = canvas.getPointer(); // Получаем координаты указателя мыши

        line.path[1][1] = pointer.x; // Обновляем конечную точку линии стрелки по оси X
        line.path[1][2] = pointer.y; // Обновляем конечную точку линии стрелки по оси Y
        line.setCoords(); // Обновляем координаты линии

        let angle = Math.atan2(pointer.y - line.path[0][2], pointer.x - line.path[0][1]); // Вычисляем угол между начальной и конечной точками линии
        angle *= 180 / Math.PI; // Преобразуем угол в градусы

        arrow.left = pointer.x - line.strokeWidth / 2 * Math.cos(angle * Math.PI / 180); // Устанавливаем положение головы стрелки по оси X
        arrow.top = pointer.y - line.strokeWidth / 2 * Math.sin(angle * Math.PI / 180); // Устанавливаем положение головы стрелки по оси Y
        arrow.angle = angle - 90; // Применяем угол к голове стрелки и добавляем 90 градусов

        arrow.setCoords(); // Обновляем координаты головы стрелки

        canvas.requestRenderAll(); // Перерисовываем холст
    }
}

//& Функция для завершения рисования стрелки при отпускании кнопки мыши ->
function stopDrawingArrowOnMouseUp() {
    drawMode = false; // Выключаем режим рисования

    let updatedLinePath = line.path; // Получаем обновленный путь линии стрелки

    canvas.remove(line); // Удаляем старую линию стрелки с холста

    line = new fabric.Path(updatedLinePath, { // Создаем новую линию стрелки
        id: 'added-line',
        label: 'arrow-line',
        stroke: 'black',
        strokeWidth: 3,
        strokeLineCap: 'round', // Добавляем скругление к концам линии
        strokeLineJoin: 'round', // Добавляем скругление к соединениям линии
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        objectCaching: false,
        selectable: false,
    });

    canvas.add(line); // Добавляем новую линию на холст

    let obj = []; // Создаем массив для объектов стрелки
    canvas.getObjects().forEach(function (shape) { // Проходим по всем объектам на холсте
        if (shape.label === 'arrow-line') { // Если объект является частью стрелки
            obj.push(shape); // Добавляем объект в массив
        }
    });

    obj = obj.reverse(); // Переворачиваем массив, чтобы голова стрелки была сверху

    let singleArrow = new fabric.Group(obj, { // Создаем группу для стрелки
        id: 'single-arrow',
        originX: 'center',
        originY: 'center',
        hasControls: false,
        hasBorders: false,
        objectCaching: false,
        selectable: false,
        padding: 20
    })

    canvas.remove(line, arrow) // Удаляем старые объекты стрелки с холста
    canvas.add(singleArrow); // Добавляем новую группу на холст
    singleArrow.on('mousedown', showArrowMenu);
    canvas.requestRenderAll(); // Перерисовываем холст
    stopDrawArrow();
    loadListeners();
}


//& Функция для удаления выделенных объектов DELETE
function deleteObject() {
    shapeMenu.classList.remove('active_shape');
    const activeObjects = canvas.getActiveObjects(); // Получаем все выделенные объекты
    activeObjects.forEach(function (object) {
        canvas.remove(object); // Удаляем каждый выделенный объект
    });
    canvas.discardActiveObject().renderAll(); // Сбрасываем выделение и перерисовываем холст
}

//& Функция для начала рисования текста при нажатии кнопки мыши 🖱️ 
function addingTextMouseDown() {
    let pointer = canvas.getPointer(); // Получаем координаты указателя мыши
    drawMode = true; // Включаем режим рисования
    text = new fabric.IText('', { // Создаем новый текст
        left: pointer.x,
        top: pointer.y,
        fontSize: 1,
        fontSizeMult: 1,
        textAlign: 'left',
        fontFamily: 'Arial',
        statefullCache: true,
        splitByGrapheme: true,
        strokeUniform: true,
        objectCaching: false,
    });

    canvas.add(text); // Добавляем текст на холст
}

//& Функция для изменения размера текста при перемещении мыши 🖱️ 
function drawingTextOnMouseMove() {
    if (drawMode === true) { // Если включен режим рисования
        let pointer = canvas.getPointer(); // Получаем координаты указателя мыши

        // Вычисляем новый размер шрифта на основе расстояния от начальной точки
        let fontSize = Math.sqrt(Math.pow(pointer.x - text.left, 2) + Math.pow(pointer.y - text.top, 2)) / 4;
        text.set({ fontSize: fontSize }); // Обновляем размер шрифта

        // Вычисляем новую ширину и высоту текста на основе перемещения указателя мыши
        let width = Math.abs(pointer.x - text.left);
        let height = Math.abs(pointer.y - text.top);

        text.set({ width: width, height: height }); // Обновляем ширину и высоту текста

        canvas.requestRenderAll(); // Перерисовываем холст
    }
}

//& Функция для завершения рисования текста при отпускании кнопки мыши 🖱️ 
function stopDrawingTextOnMouseUp() {
    drawMode = false; // Выключаем режим рисования
    text.setControlsVisibility({
        mt: false, // верхняя точка
        mb: false,
        ml: false,
        mr: false
    });

    canvas.setActiveObject(text);
    canvas.renderAll(); // Перерисовываем холст
    stopDrawingText();
    loadListeners();
}

//& Функция для начала рисования прямоугольника при нажатии кнопки мыши ⬜ 
function addingRectMouseDown() {
    let pointer = canvas.getPointer(); // Получаем координаты указателя мыши
    drawMode = true; // Включаем режим рисования
    square = new fabric.Rect({ // Создаем новый прямоугольник
        id: 'shape',
        left: pointer.x,
        top: pointer.y,
        fill: 'white',
        width: 0,
        height: 0,
        originX: 'left',
        originY: 'top',
        selectable: true,
        hasControls: true,
        strokeUniform: true,
        hasBorders: true,
        objectCaching: false,
    });

    canvas.add(square); // Добавляем прямоугольник на холст
}

//& Функция для обновления размеров прямоугольника при движении мыши ⬜ 
function drawingRectOnMouseMove() {
    if (drawMode === true) { // Если включен режим рисования
        let pointer = canvas.getPointer(); // Получаем координаты указателя мыши

        square.set({ width: Math.abs(pointer.x - square.left), height: Math.abs(pointer.y - square.top) }); // Обновляем ширину и высоту прямоугольника

        if (pointer.x < square.left) {
            square.set({ originX: 'right' });
        } else {
            square.set({ originX: 'left' });
        }

        if (pointer.y < square.top) {
            square.set({ originY: 'bottom' });
        } else {
            square.set({ originY: 'top' });
        }

        canvas.requestRenderAll(); // Перерисовываем холст
    }
}

//& Функция для завершения рисования прямоугольника при отпускании кнопки мыши ⬜ 
function stopDrawingRectOnMouseUp() {
    drawMode = false; // Выключаем режим рисования
    canvas.remove(square);
    canvas.add(square);
    square.on('mousedown', showShapeMenu);
    canvas.renderAll(); // Перерисовываем холст
    canvas.setActiveObject(square);
    stopDrawingRect();
    loadListeners();
}


//& Функция для начала рисования эллипса при нажатии кнопки мыши 🔵 
function addingEllipseMouseDown() {
    let pointer = canvas.getPointer(); // Получаем координаты указателя мыши
    drawMode = true; // Включаем режим рисования
    ellipse = new fabric.Ellipse({ // Создаем новый эллипс
        id: 'shape',
        left: pointer.x,
        top: pointer.y,
        fill: 'white',
        rx: 0, // Радиус по горизонтали равен нулю
        ry: 0, // Радиус по вертикали равен нулю
        originX: 'left',
        originY: 'top',
        stroke: '#228eff',
        strokeWidth: 1,
        selectable: true,
        hasControls: true,
        strokeUniform: true,
        hasBorders: true,
        objectCaching: false,
        centeredScaling: false,
        activeObjects: true
    });

    canvas.add(ellipse); // Добавляем эллипс на холст
}

//& Функция для обновления размеров эллипса при движении мыши 🔵 
function drawingEllipseOnMouseMove() {
    if (drawMode === true) { // Если включен режим рисования
        let pointer = canvas.getPointer(); // Получаем координаты указателя мыши

        ellipse.set({ rx: Math.abs(pointer.x - ellipse.left) / 2, ry: Math.abs(pointer.y - ellipse.top) / 2 }); // Обновляем радиусы эллипса

        // Проверяем, с какой стороны от центра эллипса находится указатель мыши и меняем свойства originX и originY соответственно
        if (pointer.x < ellipse.left) {
            ellipse.set({ originX: 'right' });
        } else {
            ellipse.set({ originX: 'left' });
        }

        if (pointer.y < ellipse.top) {
            ellipse.set({ originY: 'bottom' });
        } else {
            ellipse.set({ originY: 'top' });
        }

        canvas.requestRenderAll(); // Перерисовываем холст
    }
}

//& Функция для завершения рисования эллипса при отпускании кнопки мыши 🔵 
function stopDrawingEllipseOnMouseUp() {
    drawMode = false; // Выключаем режим рисования
    canvas.remove(ellipse);
    ellipse.set({
        strokeWidth: 0
    })
    ellipse.on('mousedown', showShapeMenu);
    canvas.add(ellipse);
    canvas.renderAll(); // Перерисовываем холст
    stopDrawingEllipse();
    loadListeners();
}

//& Функция для начала рисования ромба при нажатии кнопки мыши 🔹 

function addingRhombusMouseDown() {
    let pointer = canvas.getPointer();
    drawMode = true;
    initialPointer = { x: pointer.x, y: pointer.y }; // Сохраняем начальные координаты
    rhombus = new fabric.Polygon([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], {
        left: pointer.x,
        top: pointer.y,
        fill: 'white',
        originX: 'center', // Изменяем на 'center'
        originY: 'center', // Изменяем на 'center'
        selectable: true,
        hasControls: true,
        stroke: '#228eff',
        strokeWidth: 1,
        strokeUniform: true,
        hasBorders: true,
        objectCaching: false,
    });
    canvas.add(rhombus);
}

//& Функция для обновления размеров ромба при движении мыши 🔹 

function drawingRhombusOnMouseMove() {
    if (drawMode === true) {
        let pointer = canvas.getPointer();

        let width = Math.abs(pointer.x - initialPointer.x);
        let height = Math.abs(pointer.y - initialPointer.y);

        rhombus.set({
            points: [
                { x: -width / 2, y: 0 },
                { x: 0, y: -height / 2 },
                { x: width / 2, y: 0 },
                { x: 0, y: height / 2 }
            ],
            width: width,
            height: height,
            left: Math.min(pointer.x, initialPointer.x) + width / 2,
            top: Math.min(pointer.y, initialPointer.y) + height / 2,
        });
    }
    canvas.requestRenderAll();
}

//& Функция для завершения рисования ромба при отпускании кнопки мыши 🔹  

function stopDrawingRhombusOnMouseUp() {
    drawMode = false;
    let pointer = canvas.getPointer();
    let width = Math.abs(pointer.x - initialPointer.x);
    let height = Math.abs(pointer.y - initialPointer.y);

    canvas.remove(rhombus);
    rhombus.set({
        id: 'shape',
        width: width,
        height: height,
        strokeWidth: 0,
    })
    rhombus.on('mousedown', showShapeMenu);
    canvas.add(rhombus);
    canvas.renderAll();
    stopDrawingRhombus();
}

//& Функция для начала рисования треугольника при нажатии кнопки мыши △

function addingTriangleMouseDown() {
    let pointer = canvas.getPointer();
    drawMode = true;
    initialPointer = { x: pointer.x, y: pointer.y }; // Сохраняем начальные координаты
    triangle = new fabric.Polygon([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], {
        id: 'shape',
        left: pointer.x,
        top: pointer.y,
        fill: 'white',
        originX: 'center', // Изменяем на 'center'
        originY: 'center', // Изменяем на 'center'
        selectable: true,
        hasControls: true,
        stroke: '#228eff',
        strokeWidth: 1,
        strokeUniform: true,
        hasBorders: true,
        objectCaching: false,
        centeredRotation: true,
        centeredScaling: true
    });
    canvas.add(triangle);
}

//& Функция для обновления размеров треугольника при движении мыши △

function drawingTriangleOnMouseMove() {
    if (drawMode === true) {
        let pointer = canvas.getPointer();

        let width = Math.abs(pointer.x - initialPointer.x);
        let height = Math.abs(pointer.y - initialPointer.y);

        // Определяем направление движения мыши
        let directionY = (pointer.y - initialPointer.y) >= 0 ? 1 : -1;

        triangle.set({
            points: [
                { x: -width / 2, y: height / 2 * directionY },
                { x: width / 2, y: height / 2 * directionY },
                { x: 0, y: -height / 2 * directionY }
            ],
            width: width,
            height: height,
            left: Math.min(pointer.x, initialPointer.x) + width / 2,
            top: Math.min(pointer.y, initialPointer.y) + height / 2,
        });
    }
    canvas.requestRenderAll();
}

//& Функция для завершения рисования треугольника при отпускании кнопки мыши △

function stopDrawingTriangleOnMouseUp() {
    drawMode = false;
    let pointer = canvas.getPointer();
    let width = Math.abs(pointer.x - initialPointer.x);
    let height = Math.abs(pointer.y - initialPointer.y);

    canvas.remove(triangle);
    triangle.set({
        width: width,
        height: height,
        strokeWidth: 0,
    })
    triangle.on('mousedown', showShapeMenu);
    canvas.add(triangle);
    canvas.renderAll();
    stopDrawingTriangle();
}

//& Функция для остановки рисования прямоугольника DELETE⬜ 
function stopDrawingRect() {
    canvas.defaultCursor = 'default'; // Устанавливаем стандартный курсор
    canvas.off({ // Отключаем обработчики событий мыши, связанные с рисованием прямоугольника
        'mouse:down': addingRectMouseDown,
        'mouse:move': drawingRectOnMouseMove,
        'mouse:up': stopDrawingRectOnMouseUp,
    })
}

//& Функция отлючающая рисование эллипса DELETE🔵 
function stopDrawingEllipse() {
    canvas.defaultCursor = 'default'; // Устанавливаем стандартный курсор
    canvas.off({ // Отключаем обработчики событий мыши, связанные с рисованием эллипса
        'mouse:down': addingEllipseMouseDown,
        'mouse:move': drawingEllipseOnMouseMove,
        'mouse:up': stopDrawingEllipseOnMouseUp,
    })
}

//& Функция отлючающая рисование ромба 🔹  
function stopDrawingRhombus() {

    canvas.defaultCursor = 'default'; // Устанавливаем стандартный курсор
    canvas.off({ // Отключаем обработчики событий мыши, связанные с рисованием эллипса
        'mouse:down': addingRhombusMouseDown,
        'mouse:move': drawingRhombusOnMouseMove,
        'mouse:up': stopDrawingRhombusOnMouseUp,
    })
}

//& Функция отключающая рисование треугольника △
function stopDrawingTriangle() {

    canvas.defaultCursor = 'default'; // Устанавливаем стандартный курсор
    canvas.off({ // Отключаем обработчики событий мыши, связанные с рисованием треугольника
        'mouse:down': addingTriangleMouseDown,
        'mouse:move': drawingTriangleOnMouseMove,
        'mouse:up': stopDrawingTriangleOnMouseUp,
    })
};

//& Функция отключающая рисование текста
function stopDrawingText() {

    canvas.defaultCursor = 'default'; // Устанавливаем стандартный курсор
    canvas.off({ // Отключаем обработчики событий мыши, связанные с рисованием треугольника
        'mouse:down': addingTextMouseDown,
        'mouse:move': drawingTextOnMouseMove,
        'mouse:up': stopDrawingTextOnMouseUp,
    })
};

//& Функция для остановки рисования стрелок ->
function stopDrawArrow() {
    canvas.defaultCursor = 'default'; // Устанавливаем стандартный курсор
    canvas.selection = true; // Включаем возможность выделения объектов
    canvas.off({ // Отключаем обработчики событий мыши, связанные с рисованием стрелок
        'mouse:down': addingArrowMouseDown,
        'mouse:move': drawingArrowOnMouseMove,
        'mouse:up': stopDrawingArrowOnMouseUp,
    })
    canvas.getObjects().forEach(function (shape) { // Проходим по всем объектам на холсте
        if (shape.id === 'single-arrow') { // Если объект является стрелкой
            shape.selectable = true; // Включаем возможность выделения стрелки
            shape.hasBorders = true; // Включаем отображение границ стрелки
            shape.hasControls = true; // Включаем отображение контролов стрелки
            shape.hasRotatingPoint = true; // Включаем возможность вращения стрелки
            shape.transparentCorners = false;
            shape.cornerSize = 10;
            shape.cornerStyle = 'circle';
        }
    })
}

//& Функция для остановки всех событий рисования 
function stopDrawEvent() {
    stopDrawArrow();
    stopDrawingRect();
    stopDrawingEllipse();
    stopDrawingTriangle();
    canvas.isDrawingMode = false;
}


//& Функция свободного рисования
function drawBrush() {
    canvas.discardActiveObject().renderAll();
    canvas.isDrawingMode = true;
    if (canvas.isDrawingMode) {
        canvas.off('mouse:down')
        const brush = canvas.freeDrawingBrush;
        brush.color = brushColor;
        brush.width = brushSize;
    }
}

//& save object svg
function saveObject() {
    var obj = canvas.getActiveObject();
    var svg = obj.toSVG();
    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-svg.svg";
    link.click();
    canvas.renderAll();
}


//Модификация обьекта (передвижение по канвас, scaling)
canvas.on('object:modified', function (e) {
    var modifiedObject = e.target;

    if (modifiedObject.id === 'shape') {
        shapeFillPicker.color = modifiedObject.fill;
        var width = modifiedObject.width * modifiedObject.scaleX;
        var height = modifiedObject.height * modifiedObject.scaleY;
        widthValue.innerText = parseInt(width);
        heightValue.innerText = parseInt(height);
    } else if (modifiedObject.id === 'single-arrow') {
        console.log('modification arrow')
    } else {
        return
    }
});

//& Событие при передвижении
canvas.on('object:moving', function (e) {
    var object = canvas.getActiveObject();

    if (object.id === 'shape') {
        //* Получаем ограничивающий прямоугольник объекта
        var boundingRect = object.getBoundingRect();
        //* Получаем координаты холста относительно окна
        var canvasRect = canvas.getElement().getBoundingClientRect();
        //* Вычисляем координаты объекта относительно окна
        var objectLeft = boundingRect.left + canvasRect.left;
        var objectTop = boundingRect.top + canvasRect.top;
        //*добавляем в shapeMenu ширину и высоту текущего элемента
        shapeMenu.style.left = objectLeft - 40 + 'px';
        shapeMenu.style.top = objectTop - 90 + 'px';
        shapeMenu.classList.add('active_shape');
    } else if (object.id === 'single-arrow') {
        //* Получаем ограничивающий прямоугольник объекта
        var boundingRect = object.getBoundingRect();
        //* Получаем координаты холста относительно окна
        var canvasRect = canvas.getElement().getBoundingClientRect();
        //* Вычисляем координаты объекта относительно окна
        var objectLeft = boundingRect.left + canvasRect.left;
        var objectTop = boundingRect.top + canvasRect.top;
        console.log('arrow')
        elements.arrow_menu.style.left = objectLeft - 40 + 'px';
        elements.arrow_menu.style.top = objectTop - 90 + 'px';
        elements.arrow_menu.classList.add('arrow_visible');
    }

})

canvas.on('object:scaling', () => {
    var object = canvas.getActiveObject();
    if (object.id === 'shape') {
        //* Ширина и высота текущего элемента
        var width = object.width * object.scaleX;
        var height = object.height * object.scaleY;
        widthValue.innerText = parseInt(width);
        heightValue.innerText = parseInt(height);
    }
})

function showShapeMenu() {
    elements.arrow_menu.classList.remove('arrow_visible');
    // Получаем активный объект
    var object = canvas.getActiveObject();

    if (object && object.id === 'shape') {
        //^Подготовка
        //* Получаем ограничивающий прямоугольник объекта
        var boundingRect = object.getBoundingRect();
        //* Получаем координаты холста относительно окна
        var canvasRect = canvas.getElement().getBoundingClientRect();
        //* Вычисляем координаты объекта относительно окна
        var objectLeft = boundingRect.left + canvasRect.left;
        var objectTop = boundingRect.top + canvasRect.top;
        //* Ширина и высота текущего элемента
        var width = object.width * object.scaleX;
        var height = object.height * object.scaleY;
        //^Действие
        //* Устанавливаем координаты shapeMenu выше объекта на 90px сдвиг влево 40px
        shapeMenu.style.left = objectLeft - 40 + 'px';
        shapeMenu.style.top = objectTop - 90 + 'px';
        shapeMenu.classList.add('active_shape');
        //* Добавляем в shapeMenu высоты и ширину текущего элемента и цвет из fill picker
        widthValue.innerText = parseInt(width);
        heightValue.innerText = parseInt(height);
        shapeFillPicker.color = object.fill;
    } else {
        return
    }
}

function showArrowMenu() {
    shapeMenu.classList.remove('active_shape');
    var object = canvas.getActiveObject();
    //^Подготовка
    //* Получаем ограничивающий прямоугольник объекта
    var boundingRect = object.getBoundingRect();
    //* Получаем координаты холста относительно окна
    var canvasRect = canvas.getElement().getBoundingClientRect();
    //* Вычисляем координаты объекта относительно окна
    var objectLeft = boundingRect.left + canvasRect.left;
    var objectTop = boundingRect.top + canvasRect.top;
    elements.arrow_menu.style.left = objectLeft - 40 + 'px';
    elements.arrow_menu.style.top = objectTop - 90 + 'px';
    elements.arrow_menu.classList.add('arrow_visible');
}

//* Изменение заливки, пикер доступен только по клику на обьект shape
function changeFill(evt) {
    const color = evt.detail.hex8;
    const activeObj = canvas.getActiveObjects();

    activeObj.forEach((obj) => {
        obj.fill = color;
        canvas.renderAll();
    })

    //*Получаем текущее значение opacity
    const str = evt.detail.hsva;
    const values = str.split(',');
    const opacity = values[values.length - 1].slice(0, -1); // Удаляем последнюю скобку
    elements.fill_value.innerText = parseInt(opacity * 100) + '%';

}


canvas.on("selection:cleared", () => {
    shapeMenu.classList.remove('active_shape');
    elements.arrow_menu.classList.remove('arrow_visible');
})


function toggleBlockActiveObject() {
    var activeObject = canvas.getActiveObject();
    if (activeObject) {
        if (activeObject.type === 'group' || activeObject.type === 'activeSelection') {
            activeObject.forEachObject(function (object) {
                object.lockMovementX = !object.lockMovementX;
                object.lockMovementY = !object.lockMovementY;
                // object.selectable = !object.selectable;
            });
        } else {
            activeObject.lockMovementX = !activeObject.lockMovementX;
            activeObject.lockMovementY = !activeObject.lockMovementY;
            activeObject.selectable = !activeObject.selectable;
        }
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }
}
