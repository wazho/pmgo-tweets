// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
import fetch from 'node-fetch';
// Local modules.
import TWITTER_USERS from '../data/twitter-users.json';

const AuthToken = String(process.env.BEARER_TOKEN);

const getTweets = async (userId: string): Promise<any[]> => {
  const url = `https://api.twitter.com/2/users/${userId}/tweets`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: AuthToken,
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
      Authorization: AuthToken,
    },
  });
  const { data: tweets, includes: { media: mediaList } } = await response.json();

  const formattedTweets = tweets.map((tweet: any) => ({
    id: tweet.id,
    text: tweet.text,
    media: mediaList.find((media: any) => {
      const mediaKeys = tweet.attachments?.media_keys || [];
      const foundMedia = mediaKeys.includes(media.media_key);
      return {
        type: foundMedia.type,
        url: foundMedia.url,
      };
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
    tweetList.push({
      name: twitterUser.username,
      tweets,
    });
  }

  await writeFile(`${outputPath}/tweet-list.json`, JSON.stringify(tweetList));
};

main();
