$(function () {
	$("form").
		on("change", function () {
			calc();
		}).
		submit(function () {
			$(this).trigger('change');
			return false;
		}).
		deserialize(localStorage.save || {}).
		trigger('change');

	setInterval(function () {
		calc();

		localStorage.save = $("form").serialize();
	}, 1000);


	function calc () {
		var form = $("form");
		var frequency = +form.find('[name=frequency]').val();
		$('#recommended-length').text( ( (4.7 / frequency) * 2 ).toFixed(2) );


		var elementLength = $('[name=element-length]');
		var elementsRadius = $('[name=element-radius]');

		var capacitance = 0;
		var radiatorLength = 0;
		for (var i = 0, l; (l = elementLength[i]) && (r = elementsRadius[i]); i++) {
			l = +l.value;
			if (!l) continue;
			r = +r.value / 1000; // mm -> m
			capacitance += 19.1 * l / (Math.log(0.575 * l / r) * Math.LOG10E);
			radiatorLength += l;
		}

		$('#capacitance').text(capacitance.toFixed(2));

		var inductance = Math.pow(159 / frequency, 2) / capacitance;
		$('#inductance').text(inductance.toFixed(2));


		var coilRadius = +$('[name=coil-radius]').val();
		var coilLength = +$('[name=coil-length]').val();
		var closeCoiling = $('[name=close-coiling]').prop('checked');

		var coilTurns = NaN;
		if (closeCoiling) {
			for (var i = 1; i < 10000; i++) {
				coilTurns = calcCoilTurns(inductance, coilRadius, i);
				if (coilTurns < i) {
					break;
				}
			}
			coilLength = i;
			$('[name=coil-length]').val(i);
		} else {
			coilTurns = calcCoilTurns(inductance, coilRadius, coilLength);
		}

		$('#coil-turns').text(coilTurns.toFixed(1));

		var radialLength = 58 / frequency;
		$('#radial-length').text(radialLength.toFixed(1));

		var totalLength = radiatorLength + (coilLength / 1000) + (30 / 1000) + (150 / 1000);
		$('#total-length').text(
			totalLength.toFixed(1) + ' m'
		);
		$('#total-length-breakdown').text(
			' = ' + (radiatorLength  * 1000) + 'mm (Radiator Length) + ' + coilLength + 'mm (Coil Length) + 30mm (Coil Upper Join Space) + 150mm (Coil Lower Joint Space)'
		);




		var canvas = document.getElementById('canvas');
		canvas.width  = $('.container').innerWidth();
		canvas.height = 500;
		var ctx = canvas.getContext('2d');

		var scale =  canvas.width / (totalLength * 1000 + 100);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.translate(10, 150);
		ctx.scale(scale, scale);

		var pathPipe =  function (x, radius, length) {
			ctx.beginPath();
			ctx.moveTo(x, -radius / 2);
			ctx.lineTo(x, +radius / 2);
			ctx.lineTo(x + length, +radius / 2);
			ctx.lineTo(x + length, -radius / 2);
			ctx.lineTo(x, -radius / 2);
		};

		var offset = 50;
		var drawSize = function (x, length, barSize, direction) {
			ctx.beginPath();
			ctx.moveTo(x, offset * direction);
			ctx.lineTo(x, (offset + barSize) * direction);
			ctx.moveTo(x + length, offset * direction);
			ctx.lineTo(x + length, (offset + barSize) * direction);
			ctx.moveTo(x, (offset + barSize * 0.8) * direction);
			ctx.lineTo(x + length, (offset + barSize * 0.8) * direction);
			ctx.stroke();
			ctx.font = (1 / scale * 10) + "px Arial";
			ctx.textAlign = "center";
			ctx.fillText(length + "mm", x + length / 2, (offset + barSize * 0.8) * direction);
		};

		var x = 0;
		ctx.strokeStyle = '#000000';
		ctx.fillStyle = '#000000';

		drawSize(x, Math.floor(totalLength * 1000), 200, -1);

		pathPipe(x, coilRadius, coilLength + 300);
		ctx.stroke();
		drawSize(x, coilLength + 300, 100, 1);

		x += 150;
		pathPipe(x, coilRadius + 2, coilLength);
		ctx.fill();
		drawSize(x, coilLength, 50, 1);

		x += coilLength + 30;
		for (var i = 0, d = -1, l; (l = elementLength[i]) && (r = elementsRadius[i]); i++) { // no warnings
			l = +l.value;
			if (!l) continue;
			r = +r.value;
			var n = (i > 0 ? 150 : 0);
			pathPipe(x - n, r, l * 1000 + n);
			ctx.stroke();
			drawSize(x - n, l * 1000 + n, 100, d);

			if (n) {
				drawSize(x - n, n, 50, d);
			}

			d *= -1;
			x += l * 1000;
		}
	}

	function calcCoilTurns (inductance, coilRadius, coilLength) {
		var nagaokaFactor = 1 / (1 + 0.9 *(coilRadius / 2) / coilLength - 0.02 * (coilRadius / 2) / (coilLength * coilLength));
		var coilTurns = 2/(3.14*coilRadius)*Math.sqrt((inductance*coilLength)/(nagaokaFactor*0.4))*Math.sqrt(1000);
		return coilTurns;
	}
});
