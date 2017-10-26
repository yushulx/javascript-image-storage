/**
 * Log function
 */
function log(msg) {
  let status = 0;

  switch (status) {
    case 0:
      console.log(msg);
      break;
    case 1:
      alert(msg);
      break;
  }
}

/**
 * Use FileSystem
 */
function errorHandler(e) {
  var msg = '';

  switch (e.code) {
    case DOMError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case DOMError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case DOMError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case DOMError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case DOMError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  };

  log('Error: ' + msg);
}

window.requestFileSystem =
  window.requestFileSystem || window.webkitRequestFileSystem;

var fileReader = new FileReader(),
  filter =
  /^(?:image\/bmp|image\/cis\-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x\-cmu\-raster|image\/x\-cmx|image\/x\-icon|image\/x\-portable\-anymap|image\/x\-portable\-bitmap|image\/x\-portable\-graymap|image\/x\-portable\-pixmap|image\/x\-rgb|image\/x\-xbitmap|image\/x\-xpixmap|image\/x\-xwindowdump)$/i;

var btPrev = document.getElementById('prev');
btPrev.onclick = onPrevious;
var btNext = document.getElementById('next');
btNext.onclick = onNext;
var btRemove = document.getElementById('remove');
btRemove.onclick = onRemove;
var btDetect = document.getElementById('detect');
btDetect.onclick = onDetect;

var CacheManager = (function () {
  function CacheManager() {
    this.storageSize = 1024 * 1024 * 100; // 100M
    this.usedStorage = 0;
    this.all = [];
    this.current = [];
    this.prev = [];
    this.next = [];
  }
  CacheManager.prototype.getAvailableStorage = function () {
    return this.storageSize - this.usedStorage;
  };
  CacheManager.prototype.hasStorage = function (size) {
    if (size > this.getAvailableStorage()) {
      return false;
    } else {
      this.usedStorage += size;
      return true;
    }
  };

  CacheManager.prototype.readFile = function (fileName, callback) {
    function onInitFs(fs) {
      fs.root.getFile(
        fileName, {},
        function (fileEntry) {

          // Get a File object representing the file,
          // then use FileReader to read its contents.
          fileEntry.file(callback, errorHandler);

        },
        errorHandler);
    }

    window.requestFileSystem(
      window.TEMPORARY, this.storageSize, onInitFs, errorHandler);
  };

  CacheManager.prototype.writeFile = function (
    fileName, blob, successCallback, errorCallback) {
    let all = this.all;
    let prev = this.prev;
    let current = this.current;

    function onInitFs(fs) {
      fs.root.getFile(fileName, {
        create: true
      }, function (fileEntry) {
        fileEntry.createWriter(function (fileWriter) {

          fileWriter.truncate(0);

        }, errorHandler);

        fileEntry.createWriter(function (fileWriter) {

          fileWriter.onwriteend = function (e) {
            all.push(fileName);

            let oldImage = '';
            if (all.length > 1) {
              if (current.length === 1) {
                oldImage = current.pop();
                prev.push(oldImage);
              }
            }

            current.push(fileName);
            console.log('Write completed.');
            successCallback();
          };

          fileWriter.onerror = function (e) {
            console.log('Write failed: ' + e.toString());
            errorCallback();
          };

          fileWriter.write(blob);

        }, errorHandler);

      }, errorHandler);
    }

    window.requestFileSystem(
      window.TEMPORARY, this.storageSize, onInitFs, errorHandler);
  };

  CacheManager.prototype.removeFile = function (fileName) {
    // Remove file name from array
    var index = this.all.indexOf(fileName);
    if (index > -1) {
      if (index === (this.all.length - 1)) {
        this.all.splice(index, 1);
        this.current.pop();

        if (index === 0) {
          // Only one image
        } else {
          // Show the previous image
          let current = this.prev.pop();
          this.current.push(current);
        }
      } else {
        this.all.splice(index, 1);
        this.current.pop();

        // Show the next image
        let current = this.next.pop();
        this.current.push(current);
      }

      function onInitFs(fs) {
        fs.root.getFile(fileName, {
          create: false
        }, function (fileEntry) {

          fileEntry.remove(function () {
            console.log('File removed.');
          }, errorHandler);

        }, errorHandler);
      }

      window.requestFileSystem(
        window.TEMPORARY, this.storageSize, onInitFs, errorHandler);
    }
  };
  CacheManager.prototype.hasCurrent = function () {
    if (this.current.length > 0) {
      return true;
    } else
      return false;
  };
  CacheManager.prototype.hasPrevious = function () {
    if (this.prev.length > 0) {
      return true;
    } else
      return false;
  };
  CacheManager.prototype.hasNext = function () {
    if (this.next.length > 0) {
      return true;
    } else
      return false;
  };
  CacheManager.prototype.getCurrentImage = function () {
    var fileName = '';
    if (this.current.length === 1) {
      fileName = this.current[0];
    }
    return fileName;
  };
  CacheManager.prototype.getPreviousImage = function () {
    var fileName = '';
    if (this.prev.length > 0) {
      let current = this.current.pop();

      fileName = this.prev.pop();
      this.current.push(fileName);
      this.next.push(current);
    }
    return fileName;
  };
  CacheManager.prototype.getNextImage = function () {
    var fileName = '';
    if (this.next.length > 0) {
      let current = this.current.pop();

      fileName = this.next.pop();
      this.current.push(fileName);
      this.prev.push(current);
    }
    return fileName;
  };
  return CacheManager;
}());
var cacheManager = new CacheManager();

function updateButtonStatus() {
  if (cacheManager.hasNext()) {
    btNext.disabled = false;
  } else {
    btNext.disabled = true;
  }
  if (cacheManager.hasPrevious()) {
    btPrev.disabled = false;
  } else {
    btPrev.disabled = true;
  }
  if (cacheManager.hasCurrent()) {
    btRemove.disabled = false;
    btDetect.disabled = false;
  } else {
    btRemove.disabled = true;
    btDetect.disabled = true;
  }
}
updateButtonStatus();

function drawCachedImage(fileName) {
  if (fileName !== '') {
    cacheManager.readFile(fileName, function (file) {
      var reader = new FileReader();

      reader.onloadend = function (e) {
        var arrayBufferView = new Uint8Array(this.result);
        var blob = new Blob([arrayBufferView], {
          type: "image/png"
        });
        renderBlobImage(blob, 'canvas');
      };

      reader.readAsArrayBuffer(file);
    });
  } else {
    clearCanvas('canvas');
  }
}

function onDetect() {
  if (isOpenCVReady) {
    findEdges();
    // findContours();
  } else {
    alert('OpenCV is not ready!');
  }
}

function onRemove() {
  let fileName = cacheManager.getCurrentImage();
  cacheManager.removeFile(fileName);
  fileName = cacheManager.getCurrentImage();
  drawCachedImage(fileName);
  updateButtonStatus();
}

function onPrevious() {
  let fileName = cacheManager.getPreviousImage();
  drawCachedImage(fileName);
  updateButtonStatus();
}

function onNext() {
  let fileName = cacheManager.getNextImage();
  drawCachedImage(fileName);
  updateButtonStatus();
}

function successCallback() {
  updateButtonStatus();
}

function errorCallback() {}

function clearCanvas(canvasID) {
  let canvas = document.getElementById(canvasID);
  let ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function renderBlobImage(blob, canvasID) {
  var urlCreator = window.URL || window.webkitURL;

  let canvas = document.getElementById(canvasID);
  let ctx = canvas.getContext('2d');
  var image = new Image();
  image.onload = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var canvasWidth = 600;
    var canvasHeight = 400;

    var scaleFactor = Math.min((canvasWidth / image.width), (canvasHeight / image.height));
    canvas.width = image.width * scaleFactor;
    canvas.height = image.height * scaleFactor;
    ctx.drawImage(image, 0, 0, image.width * scaleFactor, image.height * scaleFactor);
  }
  image.src = urlCreator.createObjectURL(blob);
}

function loadImage() {
  if (document.getElementById("upload").files.length === 0) {
    return;
  }
  var file = document.getElementById("upload").files[0];
  if (!filter.test(file.type)) {
    alert("You must select a valid image file!");
    return;
  }
  fileReader.onload = function (event) {
    if (!cacheManager.hasStorage(event.target.result.byteLength)) {
      alert('Image storage is full. Please clear some images to get storage quota.');
      return;
    }
    let size = event.target.result.byteLength / 1024;
    log('size = ' + size + 'K');

    var arrayBufferView = new Uint8Array(this.result);
    var blob = new Blob([arrayBufferView], {
      type: "image/png"
    });

    renderBlobImage(blob, 'canvas');

    // Create a random file name
    let fileName = new Date().getTime() + '';
    // Write the file to temporary storage
    cacheManager.writeFile(fileName, blob, successCallback, errorCallback);
  };
  fileReader.readAsArrayBuffer(file);
}

/**
 * OpenCV 
 */
var isOpenCVReady = false;

function show_image(mat, canvas_id) {
  var data = mat.data(); // output is a Uint8Array that aliases directly into the Emscripten heap

  channels = mat.channels();
  channelSize = mat.elemSize1();

  var canvas = document.getElementById(canvas_id);

  ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  canvas.width = mat.cols;
  canvas.height = mat.rows;

  imdata = ctx.createImageData(mat.cols, mat.rows);

  for (var i = 0, j = 0; i < data.length; i += channels, j += 4) {
    imdata.data[j] = data[i];
    imdata.data[j + 1] = data[i + 1 % channels];
    imdata.data[j + 2] = data[i + 2 % channels];
    imdata.data[j + 3] = 255;
  }
  ctx.putImageData(imdata, 0, 0);
}

function getInput() {
  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imgData;
}

function makeGray() {
  var src = cv.matFromArray(getInput(), 24); // 24 for rgba
  var res = new cv.Mat();
  cv.cvtColor(src, res, cv.ColorConversionCodes.COLOR_RGBA2GRAY.value, 0)
  show_image(res, "canvas")
  src.delete();
  res.delete();
}

function onPreprocess() {

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  var src = cv.matFromArray(imgData, cv.CV_8UC4);
  var canny_output = new cv.Mat();
  var blurred = new cv.Mat();
  var cthresh = 75;
  cv.blur(src, blurred, [5, 5], [-1, -1], cv.BORDER_DEFAULT);
  cv.Canny(blurred, canny_output, cthresh, cthresh * 2, 3, 0);

  var contours = new cv.MatVector();
  var hierarchy = new cv.Mat();
  cv.findContours(canny_output, contours, hierarchy, 3, 2, [0, 0]);

  var item = new cv.Mat();
  // For preprocessing. Bug?
  cv.convexHull(contours.get(0), item, false, true);
  item.delete();

  src.delete();
  blurred.delete();
  contours.delete();
  hierarchy.delete();
  canny_output.delete();

}

function findContours() {
  var src = cv.matFromArray(getInput(), cv.CV_8UC4);
  var canny_output = new cv.Mat();
  var blurred = new cv.Mat();
  var cthresh = 75;
  cv.blur(src, blurred, [5, 5], [-1, -1], cv.BORDER_DEFAULT);
  cv.Canny(blurred, canny_output, cthresh, cthresh * 2, 3, 0);

  /// Find contours
  var contours = new cv.MatVector();
  var hierarchy = new cv.Mat();
  cv.findContours(canny_output, contours, hierarchy, 3, 2, [0, 0]);

  // Convex hull
  var hull = new cv.MatVector();
  for (i = 0; i < contours.size(); i++) {
    var item = new cv.Mat();
    cv.convexHull(contours.get(i), item, false, true);
    hull.push_back(item);
    item.delete();
  }

  // Draw contours + hull results
  var size = canny_output.size();
  var drawing = cv.Mat.zeros(size.get(0), size.get(1), cv.CV_8UC4);
  for (i = 0; i < contours.size(); i++) {
    var color = new cv.Scalar(Math.random() * 255, Math.random() * 255, Math.random() * 255);
    cv.drawContours(drawing, contours, i, color, 2, 8, hierarchy, 0, [0, 0]);
    var green = new cv.Scalar(30, 150, 30);
    cv.drawContours(drawing, hull, i, green, 1, 8, new cv.Mat(), 0, [0, 0]);
    color.delete();
    green.delete();
  }

  show_image(drawing, "canvas");
  src.delete();
  blurred.delete();
  drawing.delete();
  hull.delete();
  contours.delete();
  hierarchy.delete();
  canny_output.delete();
}

function findEdges() {
  var src = cv.matFromArray(getInput(), cv.CV_8UC4);
  var canny_output = new cv.Mat();
  var blurred = new cv.Mat();
  var cthresh = 75;
  cv.blur(src, blurred, [5, 5], [-1, -1], 4);
  cv.Canny(blurred, canny_output, cthresh, cthresh * 2, 3, 0);
  show_image(canny_output, "dynamsoft")
  src.delete();
  blurred.delete();
  canny_output.delete();
}

var Module = {
  setStatus: function (text) {
    if (!Module.setStatus.last) Module.setStatus.last = {
      time: Date.now(),
      text: ''
    };
    if (text === Module.setStatus.text) return;
    var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    var now = Date.now();
    if (m && now - Date.now() < 30) return; // if this is a progress update, skip it if too soon
    if (m) {
      text = m[1];

    }
    if (text === '') {
      isOpenCVReady = true;
      console.log('OpenCV is ready');
      onPreprocess();
    }

  },
  totalDependencies: 0,
  monitorRunDependencies: function (left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
  }
};
Module.setStatus('Downloading...');