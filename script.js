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
		var elementsDiameter = $('[name=element-diameter]');

		var capacitance = 0;
		var radiatorLength = 0;
		for (var i = 0, l; (l = elementLength[i]) && (r = elementsDiameter[i]); i++) {
			l = +l.value;
			if (!l) continue;
			r = +r.value / 1000; // mm -> m
			capacitance += 19.1 * l / (Math.log(0.575 * l / r) * Math.LOG10E);
			radiatorLength += l;
		}

		$('#capacitance').text(capacitance.toFixed(2));

		var inductance = Math.pow(159 / frequency, 2) / capacitance;
		$('#inductance').text(inductance.toFixed(2));


		var coilDiameter = +$('[name=coil-diameter]').val();
		var coilLength = +$('[name=coil-length]').val();
		var closeCoiling = $('[name=close-coiling]').prop('checked');

		var coilTurns = NaN;
		if (closeCoiling) {
			for (var i = 1; i < 10000; i++) {
				coilTurns = calcCoilTurns(inductance, coilDiameter, i);
				if (coilTurns < i) {
					break;
				}
			}
			coilLength = i;
			$('[name=coil-length]').val(i);
		} else {
			coilTurns = calcCoilTurns(inductance, coilDiameter, coilLength);
		}

		$('#coil-turns').text(coilTurns.toFixed(1));
		$('#coil-line-length').text( (Math.PI * coilDiameter * coilTurns).toFixed(1) );

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
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#000000';

		var scale =  canvas.width / (totalLength * 1000 + 100);

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.translate(30, 150);
		ctx.scale(scale, scale);

		var pathPipe =  function (x, diameter, length) {
			ctx.beginPath();
			ctx.moveTo(x, -diameter / 2);
			ctx.lineTo(x, +diameter / 2);
			ctx.lineTo(x + length, +diameter / 2);
			ctx.lineTo(x + length, -diameter / 2);
			ctx.lineTo(x, -diameter / 2);
		};

		var offset = 50;
		var drawSize = function (x, length, barSize, direction) {
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x, offset * direction);
			ctx.lineTo(x, (offset + barSize) * direction);
			ctx.moveTo(x + length, offset * direction);
			ctx.lineTo(x + length, (offset + barSize) * direction);
			ctx.moveTo(x, (offset + barSize * 0.8) * direction);
			ctx.lineTo(x + length, (offset + barSize * 0.8) * direction);
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#333333';
			ctx.stroke();
			ctx.font = (1 / scale * 10) + "px Arial";
			ctx.textAlign = "center";
			ctx.fillText(length + "mm", x + length / 2, (offset + barSize * 0.8) * direction);
			ctx.restore();
		};

		var x = 0;
		ctx.strokeStyle = '#000000';
		ctx.fillStyle = '#000000';

		drawSize(x, Math.floor(totalLength * 1000), 200, -1);

		pathPipe(x, coilDiameter, coilLength + 300);
		ctx.stroke();
		drawSize(x, coilLength + 300, 100, 1);

		x += 150;
		pathPipe(x, coilDiameter + 2, coilLength);
		ctx.fill();
		drawSize(x, coilLength, 50, 1);

		x += coilLength + 30;
		for (var i = 0, d = -1, l; (l = elementLength[i]) && (r = elementsDiameter[i]); i++) { // no warnings
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

		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.bezierCurveTo(
			-50, 30,
			-30, 150,
			20, 200
		);
		ctx.bezierCurveTo(
			50, 230,
			50, 220,
			500, 220
		);
		ctx.moveTo(500 + 40, 220);
		ctx.lineTo(700, 220);
		ctx.lineWidth = 5;
		ctx.strokeStyle = '#666666';
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(500, 220);
		ctx.arc(500 + 20, 220, 20, Math.PI, Math.PI * 3, false);
		ctx.lineWidth = 15;
		ctx.stroke();

		ctx.textAlign = 'left';
		ctx.font = (1 / scale * 10) + "px Arial";
		ctx.fillText(radialLength.toFixed(2) + "m", 80, 250);
	}

	function calcCoilTurns (inductance, coilDiameter, coilLength) {
		// var nagaokaFactor = 1 / (1 + 0.9 *(coilDiameter / 2) / coilLength - 0.02 * (coilDiameter / 2) / (coilLength * coilLength));
		var nagaokaFactor = nagaokaCoefficient(coilDiameter, coilLength);
		var coilTurns = 2/(3.14*coilDiameter)*Math.sqrt((inductance*coilLength)/(nagaokaFactor*0.4))*Math.sqrt(1000);
		return coilTurns;
	}

	function nagaokaCoefficient (d, l) {
		var k  = 1 / Math.sqrt(1 + ((l / d) * (l / d)));
		var k_ = k * k;

		var EI = completeEllipticIntegral(k);

		return ( 4 / (3 * Math.PI * Math.sqrt(1 - k_)) ) * (
			( (1 - k_) / k_ * EI.K ) -
			( (1 - 2 * k_) / k_ * EI.E ) -
			k
		);

		function completeEllipticIntegral (k) {
			var a, b, a1, b1, amb, E, i, kk, IK, IE;

			kk = k*k;
			a = 1;
			b = Math.sqrt(1-kk);
			E = 1-kk/2;
			i = 1;
			do
			{
				a1 = (a+b)/2;
				b1 = Math.sqrt(a*b);
				amb = a-b;
				E -= i*amb*amb/4;
				i *= 2;
				a = a1;
				b = b1;
			} while (Math.abs(a-b)>1e-15);

			IK = Math.PI/(2*a);
			IE = E*IK;

			return {
				K : IK,
				E : IE
			};
		}

	}
});
