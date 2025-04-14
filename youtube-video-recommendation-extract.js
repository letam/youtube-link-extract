
// VIDEO PAGE:


let sidebarLinks = Array.from(document.querySelectorAll('yt-lockup-view-model')).map(x => {
    let title = x.querySelector('h3').title
    let path = x.querySelector('a').href
    return {title, path}
})

let shortsLinks = Array.from(document.querySelectorAll('ytm-shorts-lockup-view-model-v2')).map(x => {
    let anchor = x.querySelector('h3').querySelector('a')
    let title = anchor.title
    let path = anchor.href

    let views = x.querySelector('.shortsLockupViewModelHostMetadataSubhead').ariaLabel

    return {title, path, views}
})



const getYoutubeVideoSidebarLinks = () => {
  const lockups = document.querySelectorAll("yt-lockup-view-model");

  const parsePublishedToDate = (published) => {
    if (!published) return null;

    const now = new Date();

    const match = published.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const unitMap = {
      second: 1000,
      minute: 1000 * 60,
      hour: 1000 * 60 * 60,
      day: 1000 * 60 * 60 * 24,
      week: 1000 * 60 * 60 * 24 * 7,
      month: 1000 * 60 * 60 * 24 * 30,
      year: 1000 * 60 * 60 * 24 * 365
    };

    const msAgo = value * (unitMap[unit] || 0);
    const publishedDate = new Date(now - msAgo);

    // If more than 24 hours ago, return just the date
    const oneDayMs = 1000 * 60 * 60 * 24;
    if (msAgo >= oneDayMs) {
      return publishedDate.toISOString().split("T")[0]; // "YYYY-MM-DD"
    }

    // If under 24 hours, return date with hour precision only
    const ms = publishedDate.getTime();
      // Round to nearest hour
      const roundedMs = Math.round(ms / (1000 * 60 * 60)) * (1000 * 60 * 60);
      const roundedDate = new Date(roundedMs);
    const iso = roundedDate.toISOString();

    const [datePart, timePart] = iso.split("T");
    const hour = timePart.split(":")[0];

    return `${datePart}T${hour}:00:00Z`;
  };

  const results = Array.from(lockups).map(lockup => {
    const linkEl = lockup.querySelector("a[href*='/watch']");
    const href = linkEl?.getAttribute("href");
    const videoIdMatch = href?.match(/v=([^&]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    const videoUrl = `https://www.youtube.com${href}`;

    const thumbnailEl = lockup.querySelector("img");
    const thumbnail = thumbnailEl?.getAttribute("src");

    const durationEl = lockup.querySelector("yt-thumbnail-badge-view-model .badge-shape-wiz__text");
    const duration = durationEl?.textContent.trim();

    const titleEl = lockup.querySelector("h3 span");
    const title = titleEl?.textContent.trim();

    const channelEl = lockup.querySelector(".yt-content-metadata-view-model-wiz__metadata-row span[role='text']");
    const channelName = channelEl?.childNodes?.[0]?.textContent.trim();

    const metadataRows = lockup.querySelectorAll(".yt-content-metadata-view-model-wiz__metadata-row span[role='text']");
    const views = metadataRows?.[1]?.textContent?.trim();
    const published = metadataRows?.[2]?.textContent?.trim();
    const publishedDateEstimate = parsePublishedToDate(published);

    const badgeEls = lockup.querySelectorAll(".yt-content-metadata-view-model-wiz__badge .badge-shape-wiz__text");
    const badges = Array.from(badgeEls).map(b => b.textContent.trim());

    return {
      title,
      videoId,
      videoUrl,
      thumbnail,
      duration,
      channel: channelName ? {
        name: channelName
      } : null,
      views,
      published,
      publishedDateEstimate,
      badges
    };
  });

  console.log(JSON.stringify(results, null, 2));
  return results;
};







// HOME PAGE:

const getHomePageShortsLinks = () => {
  const shorts = document.querySelector("ytm-shorts-lockup-view-model");
  if (!shorts) return console.error("No Shorts element found.");

  const shortsLinks = Array.from(document.querySelectorAll("ytm-shorts-lockup-view-model")).map((shorts) => {
    const linkEl = shorts.querySelector("a.shortsLockupViewModelHostEndpoint");
    const href = linkEl?.getAttribute("href");
    const videoId = href?.split("/shorts/")[1];
    const videoUrl = `https://www.youtube.com${href}`;

    const thumbnailImg = shorts.querySelector("img");
    const thumbnail = thumbnailImg?.getAttribute("src");

    const titleEl = shorts.querySelector("h3 span");
    const title = titleEl?.textContent.trim();

    const viewsEl = shorts.querySelector(".shortsLockupViewModelHostMetadataSubhead span");
    const views = viewsEl?.textContent.trim();

    // Try to find channel name (may not exist in Shorts layout)
    const channelAnchor = shorts.querySelector("a[href^='/@']");
    const channelName = channelAnchor?.textContent.trim();
    const channelUrl = channelAnchor ? `https://www.youtube.com${channelAnchor.getAttribute("href")}` : null;

    const json = {
      title,
      videoId,
      videoUrl,
      thumbnail,
      views,
      channel: channelName ? {
        name: channelName,
        url: channelUrl
      } : null
    };
    return json;
  })
  .map(json => {console.log(JSON.stringify(json, null, 2)); return json});

  return shortsLinks;
};

getHomePageShortsLinks();



const getHomePageRichLinks = () => {
  const renderer = document.querySelector("ytd-rich-item-renderer");
  if (!renderer) return console.error("No ytd-rich-item-renderer found.");

  const videoLinks = Array.from(document.querySelectorAll("ytd-rich-item-renderer")).map((renderer) => {
    if (!renderer) return console.error("No ytd-rich-item-renderer found.");

    const link = renderer.querySelector("a#video-title-link");
    const title = link?.textContent.trim();
    const href = link?.getAttribute("href");
    const videoId = href?.split("v=")[1];

    const thumbnailImg = renderer.querySelector("ytd-thumbnail img");
    const thumbnailUrl = thumbnailImg?.getAttribute("src");

    const durationEl = renderer.querySelector("ytd-thumbnail-overlay-time-status-renderer #text");
    const duration = durationEl?.textContent.trim();

    const channelEl = renderer.querySelector("#channel-name a");
    const channelName = channelEl?.textContent.trim();
    const channelUrl = channelEl?.href;

    const viewsText = [...renderer.querySelectorAll("#metadata-line span")]
      .map(el => el.textContent.trim())
      .find(text => text.includes("views"));

    const publishedText = [...renderer.querySelectorAll("#metadata-line span")]
      .map(el => el.textContent.trim())
      .find(text => text.includes("ago"));

    const json = {
      title,
      videoUrl: `https://www.youtube.com${href}`,
      videoId,
      thumbnail: thumbnailUrl,
      duration,
      channel: {
        name: channelName,
        url: `https://www.youtube.com${channelUrl}`
      },
      views: viewsText,
      published: publishedText
    };
    return json;
  })
  .filter(json => json.videoUrl !== 'https://www.youtube.comundefined')
  .map(json => {console.log(JSON.stringify(json, null, 2)); return json});

  return videoLinks;

}

getHomePageRichLinks();

copy(getHomePageRichLinks());
