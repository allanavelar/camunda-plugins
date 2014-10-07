ngDefine('cockpit.plugin.heatmap.views', function(module) {

	function HeatmapController ($scope, HeatmapService, HeatmapEngineSpecificResource) {

		$scope.show = false;
		$scope.activityStats = null;

		HeatmapEngineSpecificResource.query({id: $scope.processDefinition.id}).$then(function(response) {
			$scope.activityStats = response.data;
		});

		angular.element(document).ready(function () {
			HeatmapService.initHeatMap($scope.processDefinition.id);
		});

		// var processData = $scope.processData.newChild($scope);

		// processData.observe(['filter', 'activityInstanceHistoricStatistics',
		// 	function(filter,activityInstanceHistoricStatistics) {

		// 	if (HeatmapService.heatmap) {
		// 		HeatmapService.clear();
		// 		angular.forEach(activityInstanceHistoricStatistics, function(statsElement) {
		// 			angular.forEach($scope.$parent.processDiagram.bpmnElements, function(elem) {
		// 				if (elem.id === statsElement.id) {
		// 					var coord = $scope.getCoordinates(elem);
		// 					HeatmapService.heatmap.addData({ x:coord.x, y:coord.y, value:1 });
		// 					$('#'+elem.id).css('z-index', 999);
		// 				}
		// 			});
		// 		});
		// 	}

		// 	$scope.filter = filter;

		// }]);


		$scope.getCoordinates = function(elem) {
			return {
				x: (elem.bounds.x / 1) + (elem.bounds.width / 2),
				y: (elem.bounds.y / 1) + (elem.bounds.height / 2)
			};
		};

		$scope.toggleActivityHeatMap = function($event) {

			$($event.target.parentElement).toggleClass('active');

			HeatmapService.initHeatMap($scope.processDefinition.id);

			if ($scope.show) {
				HeatmapService.clear();
			} else {

				$scope.show = !$scope.show;

				var bpmnElements = $scope.$parent.processDiagram.bpmnElements;

				var statsElemente = {};
				angular.forEach($scope.activityStats, function(statsElement) {
					statsElemente[statsElement.id] = statsElement.count;
				});

				angular.forEach(bpmnElements, function(elem) {
					if (elem.id.toLowerCase().indexOf('sequenceflow') == 0) {
						angular.forEach($scope.activityStats, function(statsElement) {
							if (elem.targetRef == statsElement.id) {
								if(!statsElemente[elem.sourceRef]) return;

								var weight = Math.min(statsElemente[elem.sourceRef], statsElement.count);

								var startElement = eval('bpmnElements.' + elem.sourceRef);
								var coord = $scope.getCoordinates(startElement);
								HeatmapService.addHeatMapDataPoint(coord, weight);

								var endElement = eval('bpmnElements.' + elem.targetRef);
								var coord1 = $scope.getCoordinates(endElement);
								HeatmapService.addHeatMapDataPoint(coord1, weight);

								var steps = Math.sqrt(((coord.x - coord1.x) * (coord.x - coord1.x)) +
									((coord.y - coord1.y) * (coord.y - coord1.y))) / 10;

								var h_step = -(coord.x - coord1.x) / steps;
								var v_step = -(coord.y - coord1.y) / steps;
								var actualx = coord.x + h_step;
								var actualy = coord.y + v_step;
								for (var int = 0; int < steps - 1; int++) {
									HeatmapService.addHeatMapDataPoint({ x:actualx, y:actualy }, weight);
									actualx = actualx + h_step;
									actualy = actualy + v_step;
								}
							}
						});
					}
				});
			}
		};

		$scope.clearHeatMap = function() {
			HeatmapService.clear();
		};
	};

	module.controller('HeatmapController', [
		'$scope', 'HeatmapService', 'HeatmapEngineSpecificResource', HeatmapController]);

	module.service('HeatmapService', function() {

		this.heatmap = null;
		this.heatmapElement = null;

		this.clear = function() {
			if (this.heatmap) {
				this.heatmap.removeData();
			}
		};

		this.initHeatMap = function(processDefinitionId) {
			if (!document.getElementById('heatmapArea')) {

				var diagramId = 'processDiagram_' + processDefinitionId.replace(/:/g, '_').replace(/\./g, '_');

				var diagramHeight = document.getElementsByTagName('svg')[0].style.height.replace(/px/,'') ||
					$('div#' + diagramId).height();
				var diagramWidth = document.getElementsByTagName('svg')[0].style.width.replace(/px/,'') ||
					$('div#' + diagramId).width();

				this.heatmapElement = $('<div id="heatmapArea" style="position: absolute;"/>')
					.width(diagramWidth).height(diagramHeight);

				$('div#'+diagramId).parent().prepend(this.heatmapElement);

				var config = {
					"radius": 30,
					"visible": true,
					"container":document.getElementById('heatmapArea')
				};
				this.heatmap = h337.create(config);
			}
		};

		this.addHeatMapDataPoint = function(coord, evaluation) {
			this.heatmap.addData({x:coord.x, y:coord.y, value:evaluation});
		};
	});

	var Configuration = function PluginConfiguration(ViewsProvider) {

		ViewsProvider.registerDefaultView('cockpit.processDefinition.runtime.action', {
			id: 'heatmap-action', label: 'Heatmap-action',
			url: 'plugin://heatmap/static/app/views/processDefinition/heatmap-action.html',
			controller: 'HeatmapController',
			priority: 66
		});

	};

	Configuration.$inject = ['ViewsProvider'];

	module.config(Configuration);
});
