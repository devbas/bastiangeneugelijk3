---
title: Downloading Spotify's Daily Viral 50 + Top 200
date: 2020-01-26
draft: false
summary: I wanted to do some data analysis on Spotify tracks to see if there are any changes in listening habits due to season or day of the week. Luckily Spotify publishes a Viral 50 and Top 200 playlist per country, per day on spotifycharts.com.
---

I wanted to do some data analysis on Spotify tracks to see if there are any changes in listening habits due to season or day of the week. Luckily Spotify publishes a Viral 50 and Top 200 playlist *per country*, *per day* on [spotifycharts.com](https://spotifycharts.com/regional), very nice! Also not unimportant: it is possible to download the playlist as a CSV file. Anyway, I went ahead and [created a script](https://github.com/devbas/spotify-charts/blob/master/retrieve-charts.py) that does just that: downloading the viral 50 + top 200 playlist per country, per day. 


Next, I wanted to try out the [Audio Features](https://developer.spotify.com/documentation/web-api/reference/tracks/get-several-audio-features/) within the Spotify API. So I created [another script](https://github.com/devbas/spotify-charts/blob/master/retrieve-sentiment.py) that retrieved the audio analysis for every unique track. However, you do need a Developer Access Token for this, which you can [request here](https://developer.spotify.com/dashboard/applications).
The Audio Features script is pretty fast, since the Spotify API can handle up to 100 track id's in a single request. 


To make this all easy to reproduce, [have a look at the code here](https://github.com/devbas/spotify-charts). To retrieve charts, run

```python retrieve-charts.py```. 


To retrieve features per unique track in the charts, run

`python retrieve-sentiment.py -t <SPOTIFY_ACCESS_TOKEN> -d <CHARTS_CSV_DIRECTORY>`[^1].

[^1]: The `<CHARTS_CSV_DIRECTORY>` must point to the directory where the charts are stored that you retrieved with `retrieve-charts.py`. 

 