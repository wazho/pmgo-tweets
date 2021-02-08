// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
import fetch from 'node-fetch';
// Local modules.
import TWITTER_USERS from '../data/twitter-users.json';

const AuthToken = String(process.env.BEARER_TOKEN);

const getTweets = async (userId: string): Promise<any[]> => {
  const url = `https://api.twitter.com/2/users/${userId}/tweets`;
  const searchParams = new URLSearchParams({
    'max_results': '20',
  });
  const response = await fetch(`${url}?${searchParams}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AuthToken}`,
    },
  });
  const { data: tweets } = await response.json();

  return tweets;
};

const getMediaTweets = async (tweetIds: string[]): Promise<any[]> => {
  const url = `https://api.twitter.com/2/tweets`;
  const searchParams = new URLSearchParams({
    'ids': tweetIds.join(','),
    'tweet.fields': 'created_at',
    'expansions': 'attachments.media_keys',
    'media.fields': 'duration_ms,height,media_key,preview_image_url,public_metrics,type,url,width',
  });
  const response = await fetch(`${url}?${searchParams}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AuthToken}`,
    },
  });
  const { data: tweets, includes: { media: mediaList } } = await response.json();

  const formattedTweets = tweets.map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    mediaList: mediaList.filter((media: any) => {
      const mediaKeys = tweet.attachments?.media_keys || [];
      const foundMedia = mediaKeys.includes(media.media_key);
      return foundMedia;
    }),
    createdAt: tweet.created_at,
  }));

  return formattedTweets;
};

const main = async () => {
  const outputPath = './artifacts';
  await mkdirp(outputPath);

  const tweetList: any[] = [];
  for await (const twitterUser of TWITTER_USERS) {
    const tweetIds = (await getTweets(twitterUser.id)).map((tweet) => tweet.id);
    const tweets = await getMediaTweets(tweetIds);
    const mediaTweets = tweets.filter((tweet) => tweet.mediaList.length).slice(0, 10);
    tweetList.push({
      name: twitterUser.username,
      tweets: mediaTweets,
    });
  }

  await writeFile(`${outputPath}/tweet-list.min.json`, JSON.stringify(tweetList));
  await writeFile(`${outputPath}/tweet-list.json`, JSON.stringify(tweetList, null, 2));
};

main();
