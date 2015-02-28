// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ F R E E B O A R D                                                                                                                      │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2013 Jim Heising (https://github.com/jheising)                                                                             │ \\
// │ Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)                                                                                   │ \\
// │ Copyright © 2015 Daisuke Tanaka (https://github.com/tanaka0323)                                                                        │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT license.                                                                                                        │ \\
// └────────────────────────────────────────────────────────────────────┘ \\

(function() {
	'use strict';

	freeboard.addStyle('.pointer-widget', 'width:100%;');

	var pointerWidget = function (settings) {
		var self = this;

		var CIRCLE_WIDTH = 3;
		var BLOCK_HEIGHT = 60;
		var TITLE_MARGIN = 7;

		var currentID = _.uniqueId('pointer_');
		var titleElement = $('<h2 class="section-title"></h2>');
		var widgetElement = $('<div class="pointer-widget" id="' + currentID + '"></div>');
		var currentSettings = settings;
		var fontcolor = '#d3d4d4';
		var widgetSize = {
			height: 0,
			width: 0
		};

		// d3 variables
		var svg = null, center = null, pointer = null, textValue = null, textUnits = null, circle = null;

		function setBlocks(blocks) {
			if (_.isUndefined(blocks))
				return;
			var height = BLOCK_HEIGHT * blocks - titleElement.outerHeight() - TITLE_MARGIN;
			widgetElement.css({
				height: height + 'px',
				width: '100%'
			});
			resize();
		}

		function getWidgetSize(rc) {
			var h, w, aspect;
			if (rc.width > rc.height) {
				h = rc.height;
				w = h * 1.25;
				if (w > rc.width) {
					aspect = w / rc.width;
					w = w / aspect;
					h = h / aspect;
				}
			} else if (rc.width < rc.height) {
				w = rc.width;
				h = w / 1.25;
				if (h > rc.height) {
					aspect = w / rc.height;
					h = h / aspect;
					width = h / aspect;
				}
			} else {
				w = rc.width;
				h = w * 0.75;
			}
			return { height: h, width: w };
		}

		function polygonPath(points) {
			if (!points || points.length < 2)
				return [];
			var path;
			path = 'M'+points[0]+','+points[1];
			for (var i = 2; i < points.length; i += 2) {
				path += 'L'+points[i]+','+points[i+1];
			}
			path += 'Z';
			return path;
		}

		function getCenteringTransform(rc) {
			return 'translate(' + (rc.width/2) + ',' + (rc.height/2) + ')';
		}

		function getRadius(rc) {
			return Math.min(rc.height, rc.width) / 2 - CIRCLE_WIDTH * 2;
		}

		function calcValueFontSize(r) {
			return (5*r/102.5).toFixed(2);
		}

		function calcUnitsFontSize(r) {
			return (1.1*r/102.5).toFixed(2);
		}

		function getPointerPath(r) {
			return polygonPath([0, - r + CIRCLE_WIDTH, 15, -(r-20), -15, -(r-20)]);
		}

		function resize() {
			if (_.isNull(svg))
				return;

			var rc = widgetElement[0].getBoundingClientRect();
			var newSize = getWidgetSize(rc);

			svg.attr('height', rc.height);
			svg.attr('width', rc.width);

			var x = newSize.width / widgetSize.width;
			var y = newSize.height / widgetSize.height;

			center.attr('transform', getCenteringTransform(rc)+',scale('+x+', '+y+')');
		}

		function createWidget() {

			var rc = widgetElement[0].getBoundingClientRect();

			svg = d3.select('#' + currentID)
				.append('svg')
				.attr('width', rc.width)
				.attr('height', rc.height);

			center = svg.append('g')
				.attr('transform', getCenteringTransform(rc));

			widgetSize = getWidgetSize(rc);
			var r = getRadius(widgetSize);
			circle = center.append('circle')
				.attr('r', r)
				.style('fill', 'rgba(0, 0, 0, 0)')
				.style('stroke-width', CIRCLE_WIDTH)
				.style('stroke', currentSettings.circle_color);

			textValue = center.append('text')
				.text('0')
				.style('fill', fontcolor)
				.style('text-anchor', 'middle')
				.attr('dy', '.3em')
				.attr('font-size', calcValueFontSize(r) + 'em')
				.attr('class', 'ultralight-text');

			textUnits = center.append('text')
				.text(currentSettings.units)
				.style('fill', fontcolor)
				.style('text-anchor', 'middle')
				.attr('dy', '2.8em')
				.attr('font-size', calcUnitsFontSize(r) + 'em')
				.attr('class', 'ultralight-text');

			pointer = center.append('path')
				.style('fill', currentSettings.pointer_color)
				.attr('d', getPointerPath(r));
		}

		this.render = function (element) {
			$(element).append(titleElement).append(widgetElement);
			titleElement.html((_.isUndefined(currentSettings.title) ? '' : currentSettings.title));
			setBlocks(currentSettings.blocks);
			createWidget();
		};

		this.onSettingsChanged = function (newSettings) {
			if (_.isNull(svg)) {
				currentSettings = newSettings;
				return;
			}

			titleElement.html((_.isUndefined(newSettings.title) ? '' : newSettings.title));
			circle.style('stroke', newSettings.circle_color);
			pointer.style('fill', newSettings.pointer_color);
			textUnits.text((_.isUndefined(newSettings.units) ? '' : newSettings.units));
			setBlocks(newSettings.blocks);

			var updateCalculate = false;
			if (currentSettings.direction != newSettings.direction ||
				currentSettings.value_text != newSettings.value_text)
				updateCalculate = true;
			currentSettings = newSettings;
			return updateCalculate;
		};

		this.onCalculatedValueChanged = function (settingName, newValue) {
			if (_.isNull(svg))
				return;
			if (settingName === 'direction') {
				pointer.transition()
					.duration(250)
					.ease('bounce-out')
					.attrTween('transform', function(d, i, a) {
						return d3.interpolateString(a, 'rotate(' + parseInt(newValue) + ', 0, 0)');
					});
			} else if (settingName === 'value_text') {
				if (_.isUndefined(newValue))
					return;
				textValue.transition()
					.duration(500)
					.ease('circle-out')
					.tween('text', function() {
						var i = d3.interpolate(this.textContent, Number(newValue));
						return function(t) {
							this.textContent = i(t).toFixed(1);
						};
					});
			}
		};

		this.onDispose = function () {
			svg = circle = center = pointer = textValue = textUnits = null;
		};

		this.onSizeChanged = function () {
			resize();
		};

		this.getHeight = function () {
			return currentSettings.blocks;
		};

		this.onSettingsChanged(settings);
	};

	freeboard.loadWidgetPlugin({
		type_name: 'pointer',
		display_name: 'ポインタ',
		description: '方角と値を表示するウィジェットです。',
		settings: [
			{
				name: 'title',
				display_name: 'タイトル',
				validate: 'optional,maxSize[100]',
				type: 'text',
				description: '最大100文字'
			},
			{
				name: 'blocks',
				display_name: '高さ (ブロック数)',
				validate: 'required,custom[integer],min[4],max[10]',
				type: 'number',
				style: 'width:100px',
				default_value: 4,
				description: '1ブロック60ピクセル。10ブロックまで'
			},
			{
				name: 'direction',
				display_name: '方向',
				validate: 'optional,maxSize[2000]',
				type: 'calculated',
				description: '最大2000文字<br>角度を入力して下さい。'
			},
			{
				name: 'value_text',
				display_name: '値テキスト',
				validate: 'optional,maxSize[2000]',
				type: 'calculated',
				description: '最大2000文字'
			},
			{
				name: 'units',
				display_name: '単位',
				validate: 'optional,maxSize[20]',
				style: 'width:150px',
				type: 'text',
				description: '最大20文字'
			},
			{
				name: 'circle_color',
				display_name: 'サークル色',
				validate: 'required,custom[hexcolor]',
				type: 'color',
				default_value: '#ff9900',
				description: 'デフォルト色: #ff9900'
			},
			{
				name: 'pointer_color',
				display_name: 'ポインタ色',
				validate: 'required,custom[hexcolor]',
				type: 'color',
				default_value: '#fff',
				description: 'デフォルト色: #fff'
			}
		],
		newInstance: function (settings, newInstanceCallback) {
			newInstanceCallback(new pointerWidget(settings));
		}
	});
}());
