ngDefine('cockpit.plugin.heatmap.views', function(module) {

	function HeatmapController ($scope, HeatmapEngineSpecificResource) {

		$scope.activityStats = null;

		HeatmapEngineSpecificResource.query({id: $scope.processDefinition.id}).$then(function(response) {
			$scope.activityStats = response.data;
		});
		
		$scope.initHeatMap = function() {
			
			if (!document.getElementById('heatmapArea')) {
				$scope.heatmapElement = angular.element('<div id="heatmapArea"/>');
				var diagramId = 'processDiagram_' + $scope.processDefinition.id.replace(/:/g, '_');
				$('div#' + diagramId).parent().prepend($scope.heatmapElement);
				var diagramHeight = document.getElementsByTagName('svg')[0].style.height.replace(/px/,'') | $('div#' + diagramId).height();
				var diagramWidth = document.getElementsByTagName('svg')[0].style.width.replace(/px/,'') | $('div#' + diagramId).width();
				var config = {
					"radius": 10, 
					"visible": true,
					"element":document.getElementById('heatmapArea'),
					"height": diagramHeight,
					"width": diagramWidth
				};

				$scope.heatmap = h337.create(config);
				var canvas = $scope.heatmap.get('canvas');
				canvas.style.zIndex = 998;
			}
		}
		
		$scope.$on('$viewContentLoaded', function() {
			var processData = $scope.processData.newChild($scope);   

			processData.observe(['filter','activityInstanceHistoricStatistics', function(filter,activityInstanceHistoricStatistics) {

				$scope.initHeatMap();

				if ($scope.heatmap) {
					$scope.heatmap.clear();
					angular.forEach(activityInstanceHistoricStatistics, function(statsElement) {    				 
						angular.forEach($scope.$parent.processDiagram.bpmnElements, function(elem) {

							if (elem.id === statsElement.id) {
								var coord = $scope.getCoordinates(elem);
								$scope.heatmap.store.addDataPoint(coord.x,coord.y);		
								$('#'+elem.id).css('z-index', 999);
							}
						});
					});
				}
				$scope.filter = filter;
			}]);
		});
		
		$scope.getCoordinates = function(elem) {
			return{
				x: (elem.bounds.x/1) + (elem.bounds.width/2),
				y: (elem.bounds.y/1) + (elem.bounds.height/2)
			};
		};

		$scope.showActivityHeatMap = function() {

			$scope.initHeatMap();
			$scope.heatmap.clear();

			var bpmnElements = $scope.$parent.processDiagram.bpmnElements;

			var statsElemente = {};
				angular.forEach($scope.activityStats, function(statsElement) {
				statsElemente[statsElement.id] = 1;
			});

			angular.forEach(bpmnElements, function(elem) {
				if (elem.id.toLowerCase().indexOf('sequenceflow') == 0) {
					
					angular.forEach($scope.activityStats, function(statsElement) {

						if (elem.targetRef == statsElement.id) {

							if (!statsElemente[elem.sourceRef]) return;

							var startElement = eval('bpmnElements.' + elem.sourceRef);
							var coord = $scope.getCoordinates(startElement);
							$scope.addHeatMapDataPoint(coord, statsElement.count);

							var endElement = eval('bpmnElements.' + elem.targetRef);
							var coord1 = $scope.getCoordinates(endElement);
							$scope.addHeatMapDataPoint(coord1, statsElement.count);

							var steps = 10;
							var h_step = Math.abs(coord.x-coord1.x) / 10;
							var v_step = Math.abs(coord.y-coord1.y) / 10;
							var actualx = coord.x + h_step;
							var actualy = coord.y + v_step;

							for (var int = 0; int < steps-1; int++) {
								$scope.addHeatMapDataPoint({ x:actualx, y:actualy }, statsElement.count);
								actualx = actualx + h_step;
								actualy = actualy + v_step;
							} 
						}
					});
				}
			});
		};

		$scope.addHeatMapDataPoint = function(coord, wertung){    	
			for (var int = 0; int < wertung; int++) {
				$scope.heatmap.store.addDataPoint(coord.x,coord.y);
			}
		};

	};
	module.controller('HeatmapController', ['$scope', 'HeatmapEngineSpecificResource', HeatmapController]);

	var Configuration = function PluginConfiguration(ViewsProvider) {

		ViewsProvider.registerDefaultView('cockpit.processDefinition.runtime.tab', {
			id: 'heatmap-tab', label: 'Heatmap',
			url: 'plugin://heatmap/static/app/views/processDefinition/heatmap-tab.html',
			controller: 'HeatmapController',
			priority: 66
		});
	};

	Configuration.$inject = ['ViewsProvider'];

	module.config(Configuration);
});
