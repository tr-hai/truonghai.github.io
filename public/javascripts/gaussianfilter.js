 
document.addEventListener('DOMContentLoaded', function(){
	var v = document.getElementById('video');
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
	var back = document.createElement('canvas');
	var backcontext = back.getContext('2d');
 
	var cw,ch;
 
	v.addEventListener('play', function(){
		cw = v.clientWidth;
		ch = v.clientHeight;
		canvas.width = cw;
		canvas.height = ch;
		back.width = cw;
		back.height = ch;
		draw(v,context,backcontext,cw,ch);
	},false);
 
},false);
 
function draw(v,c,bc,w,h) {
	if(v.paused || v.ended)	return false;
	// First, draw it into the backing canvas
	bc.drawImage(v,0,0,w,h);
	// Grab the pixel data from the backing canvas
	var idata = bc.getImageData(0,0,w,h);
	var data = idata.data;
	// Loop through the pixels, turning them grayscale
 //  	var len = 9
 //  	var weights = new Array(len);
 //  	var rho = (1+0.5) / 3;
 //  	var rhoSq = rho*rho;
 //  	var gaussianFactor = 1 / Math.sqrt(2*Math.PI*rhoSq);
 //  	var rhoFactor = -1 / (2*rho*rho)
 //  	var wsum = 0;
 //  	var middle = Math.floor(len/2);
 //  	for (var i=0; i<len; i++) {
 //    	var x = i-middle;
 //    	var gx = gaussianFactor * Math.exp(x*x*rhoFactor);
 //    	weights[i] = gx;
 //    	wsum += gx;
 //  	}
 //  	for (var i=0; i<weights.length; i++) {
 //    	weights[i] /= wsum;
	// }

	// var data2D = [];
	// for (var i=0; i < idata.width; i++) {
	// 	data2D[i] = [];
	// 	for (var j=0; j < idata.height*4; j++){
	// 		data2D[i][j] = idata[i*j];
	// 	}
	// }

	// for (var i=0; i < idata.width-1; i++) {
	// 	for (var j=0; j < (idata.height-1)*4; j++) {
	// 		if (i == 0 || j == 0){
	// 			data2D[i][j] = 0;
	// 		}
	// 		else {
	// 			data2D[i][j] = (data2D[i-1][j-1]*weights[0] +
	// 							data2D[i][j-1]*weights[1] +
	// 							data2D[i+1][j-1]*weights[2] +
	// 							data2D[i-1][j]*weights[3] +
	// 							data2D[i][j]*weights[4] +
	// 							data2D[i+1][j]*weights[5] +
	// 							data2D[i-1][j+1]*weights[6] +
	// 							data2D[i][j+1]*weights[7] +
	// 							data2D[i+1][j+1]*weights[8] 
	// 							) / wsum
	// 		}
	// 	}
	// }


	// for(var i = 0; i < data.length; i+=4) {
	// 	var r = data[i];
	// 	var g = data[i+1];
	// 	var b = data[i+2];
	// 	var brightness = (3*r+4*g+b)>>>3;
	// 	data[i] = brightness;
	// 	data[i+1] = brightness;
	// 	data[i+2] = brightness;
	// }


	// for (var i=1; i < idata.width-1; i++) {
	// 	for (var j=1; j < (idata.height-1)*4; j++) {
	// 		data[i*j] = data2D[i][j];
	// 	}
	// }
	var test = Filters.gaussianBlur(idata,2);
	idata.width = test.width;
	idata.height = test.height;
	idata.data = test.data;
	// Draw the pixels onto the visible canvas
	c.putImageData(idata,0,0);
	// Start over!
	setTimeout(draw,20,v,c,bc,w,h);
}


Filters = {};
Filters.gaussianBlur = function(pixels, diameter) {
  diameter = Math.abs(diameter);
  if (diameter <= 1) return Filters.identity(pixels);
  var radius = diameter / 2;
  var len = Math.ceil(diameter) + (1 - (Math.ceil(diameter) % 2))
  var weights = this.getFloat32Array(len);
  var rho = (radius+0.5) / 3;
  var rhoSq = rho*rho;
  var gaussianFactor = 1 / Math.sqrt(2*Math.PI*rhoSq);
  var rhoFactor = -1 / (2*rho*rho)
  var wsum = 0;
  var middle = Math.floor(len/2);
  for (var i=0; i<len; i++) {
    var x = i-middle;
    var gx = gaussianFactor * Math.exp(x*x*rhoFactor);
    weights[i] = gx;
    wsum += gx;
  }
  for (var i=0; i<weights.length; i++) {
    weights[i] /= wsum;
  }
  return Filters.separableConvolve(pixels, weights, weights, false);
};


Filters.separableConvolve = function(pixels, horizWeights, vertWeights, opaque) {
  return this.horizontalConvolve(
    this.verticalConvolveFloat32(pixels, vertWeights, opaque),
    horizWeights, opaque
  );
};


Filters.verticalConvolveFloat32 = function(pixels, weightsVector, opaque) {
  var side = weightsVector.length;
  var halfSide = Math.floor(side/2);

  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;

  var w = sw;
  var h = sh;
  var output = Filters.createImageDataFloat32(w, h);
  var dst = output.data;

  var alphaFac = opaque ? 1 : 0;

  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      var r=0, g=0, b=0, a=0;
      for (var cy=0; cy<side; cy++) {
        var scy = Math.min(sh-1, Math.max(0, sy + cy - halfSide));
        var scx = sx;
        var srcOff = (scy*sw+scx)*4;
        var wt = weightsVector[cy];
        r += src[srcOff] * wt;
        g += src[srcOff+1] * wt;
        b += src[srcOff+2] * wt;
        a += src[srcOff+3] * wt;
      }
      dst[dstOff] = r;
      dst[dstOff+1] = g;
      dst[dstOff+2] = b;
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};

Filters.createImageDataFloat32 = function(w, h) {
  return {width: w, height: h, data: this.getFloat32Array(w*h*4)};
};

Filters.getFloat32Array = function(len) {
    return new Float32Array(len);
};


if (typeof Float32Array == 'undefined') {
  Filters.getFloat32Array =
  Filters.getUint8Array = function(len) {
    if (len.length) {
      return len.slice(0);
    }
    return new Array(len);
  };
} else {
  Filters.getFloat32Array = function(len) {
    return new Float32Array(len);
  };
  Filters.getUint8Array = function(len) {
    return new Uint8Array(len);
  };
}

Filters.horizontalConvolve = function(pixels, weightsVector, opaque) {
  var side = weightsVector.length;
  var halfSide = Math.floor(side/2);

  var src = pixels.data;
  var sw = pixels.width;
  var sh = pixels.height;

  var w = sw;
  var h = sh;
  var output = Filters.createImageData(w, h);
  var dst = output.data;

  var alphaFac = opaque ? 1 : 0;

  for (var y=0; y<h; y++) {
    for (var x=0; x<w; x++) {
      var sy = y;
      var sx = x;
      var dstOff = (y*w+x)*4;
      var r=0, g=0, b=0, a=0;
      for (var cx=0; cx<side; cx++) {
        var scy = sy;
        var scx = Math.min(sw-1, Math.max(0, sx + cx - halfSide));
        var srcOff = (scy*sw+scx)*4;
        var wt = weightsVector[cx];
        r += src[srcOff] * wt;
        g += src[srcOff+1] * wt;
        b += src[srcOff+2] * wt;
        a += src[srcOff+3] * wt;
      }
      dst[dstOff] = r;
      dst[dstOff+1] = g;
      dst[dstOff+2] = b;
      dst[dstOff+3] = a + alphaFac*(255-a);
    }
  }
  return output;
};

Filters.createImageData = function(w, h) {
    return {width: w, height: h, data: this.getFloat32Array(w*h*4)};
};