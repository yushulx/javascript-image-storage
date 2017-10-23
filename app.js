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
  } else {
    btRemove.disabled = true;
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
    ctx.drawImage(
      image, 0, 0, canvas.width,
      canvas.width * image.naturalHeight / image.naturalWidth);
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