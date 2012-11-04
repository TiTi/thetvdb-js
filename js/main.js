YUI().use('node', 'yql', 'datatable', 'event-valuechange', 'datatype-date-format', function(Y)
{
	var api_key = '80C144DF24D79C44',
		query_search_serie = "SELECT Series.seriesid,Series.SeriesName FROM thetvdb.series.getSeriesId WHERE seriesname='<SERIESEARCH>'", //AND language='en'
		query_serie = "SELECT * FROM thetvdb.series.search WHERE api_key='" + api_key + "' AND series='<SERIEID>'",

		$loading = Y.one('#loading').hide(),
		$shows = Y.one("#shows"),
		$results = Y.one("#results"),
		$tvshow = Y.one("form input[name='tvshow']"),
		searchTimer = null;

	function search(e)
	{
		clearTimeout(searchTimer);
		searchTimer = setTimeout(searchShow, 600);
	}

	$tvshow.on('valuechange', search);
	$tvshow.on('keypress', function(e)
	{
		if(e.which == 13) // Enter
		{
			e.preventDefault(); // Prevent form submit

			// Immediately trigger search
			clearTimeout(searchTimer);
			searchShow();
		}
	})

	function searchShow()
	{
		var search = $tvshow.get('value'),
			escape_regex = /\\'"/g,
			escaped_search = search.replace(escape_regex, '');
		if(escaped_search)
		{
			var query = query_search_serie.replace('<SERIESEARCH>', escaped_search);

			$loading.show();
			Y.YQL(query, function(o)
			{
				displayResults(o);
				$loading.hide();
			});
		}
		else
		{
			$shows.empty();
			$results.empty();
		}
	}

	function displayResults(o)
	{
		$shows.empty();
		$results.empty();
		if(o.error)
		{
			$results.append("Error: " + o.error.description);
		}
		else
		{
			if(!o.query.results)
			{
				$results.append("No results");
			}
			else
			{
				var results = o.query.results.Data;
				if(Y.Array.test(results))
				{
					for(var i = 0; i < results.length; ++i)
					{
						var result = results[i];
						var serieNode = Y.Node.create('<span>' + result.Series.SeriesName + '</span>');
						serieNode.on("click", function(evt, id)
						{
							this.addClass('selected');
							this.siblings().removeClass('selected');

							$results.empty();
							displaySerie(id);
						}, serieNode, result.Series.seriesid);
						$shows.appendChild(serieNode);
					}
				}
				else
				{
					displaySerie(results.Series.seriesid);
				}
			}
		}
	}

	function displaySerie(id)
	{
		$results.append('loading...');
		var query = query_serie.replace('<SERIEID>', id);
		Y.YQL(query, function(o)
		{
			$results.empty();

			var Data = o.query.results.Data,
				Episodes = Data.Episode,
				Seasons = []; // Array of Season (Array of Episode)

			// Regroup episodes per season
			for(var i = 0, len = Episodes.length; i < len; ++i)
			{
				var episode = Episodes[i],
					seasonNumber = parseInt(episode.SeasonNumber, 10);

				if(!Seasons[seasonNumber])
				{
					Seasons[seasonNumber] = [];	
				}

				Seasons[seasonNumber].push(episode);
			}

			// Add seasons in correct order
			for(i = 0, len = Seasons.length; i < len; ++i)
			{
				var table = new Y.DataTable(
				{
					columns:
					[
						{key:'EpisodeNumber', label:'Episode', sortable: true, sortFn: compareEpisodes},
						{key:'EpisodeName', label:'Name'},
						{key:'FirstAired', label:'First Aired', sortable: true, formatter:function(o)
							{
								if(!o.value)
								{
									return "";
								}

								var splits = o.value.split('-'),
									year = splits[0],
									month = splits[1],
									day = splits[2],
									d = new Date(year, month, day);
    							return Y.Date.format(d, '%F'); // TODO: user format
							}
						},
						{key:'Writer', label:'Writer'},
						{key:'Director', label:'Director', sortable: true},
						{key:'Rating', label:'Rating', sortable: true, sortFn: compareRatings}
					],
					data: Seasons[i],
					caption: "Season " + i,
					sortBy: {'EpisodeNumber': 'asc'}
				});
				var seasonNode = Y.Node.create('<div/>').setAttribute('id', 'season' + i);
				table.render(seasonNode);
				$results.appendChild(seasonNode);
			}
		});
	}

	function compareEpisodes(A, B, desc)
	{
		var numA = parseInt(A.get('EpisodeNumber'), 10),
			numB = parseInt(B.get('EpisodeNumber'), 10),
			order = 0;
		if(numA < numB)
		{
			order = -1;
		}
		else if(numA > numB)
		{
			order = 1;
		}
		return desc ? -order : order;
	}
	function compareRatings(A, B, desc)
	{
		var numA = parseFloat(A.get('Rating')),
			numB = parseFloat(B.get('Rating')),
			order = 0;
		if(numA < numB)
		{
			order = -1;
		}
		else if(numA > numB)
		{
			order = 1;
		}
		return desc ? -order : order;
	}
});