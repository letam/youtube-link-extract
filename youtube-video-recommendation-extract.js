(() => {
  // utility functions:

  const parseYoutubeTimestampToDate = (published) => {
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



  // VIDEO PAGE:

  // works with recommended shorts in the sidebar (v2 markup)
  // TODO: Auto-scroll through the shorts to load all of the thumbnails
  const getYoutubeSidebarShortsLinks = () => {
    // helper to choose a usable image URL
    const pickImgSrc = (img) => {
      if (!img) return null;
      const direct = img.getAttribute("src");
      if (direct && !direct.startsWith("data:")) return direct;
      const srcset = img.getAttribute("srcset");
      if (!srcset) return null;
      // choose the last (usually highest-res) candidate
      const last = srcset.split(",").map(s => s.trim().split(" ")[0]).filter(Boolean).pop();
      return last || null;
    };

    const toAbs = (href) => {
      try { return href ? new URL(href, location.origin).toString() : null; }
      catch { return null; }
    };

    const items = Array.from(
      document.querySelectorAll("ytm-shorts-lockup-view-model-v2 ytm-shorts-lockup-view-model")
    );

    const shortsLinks = items.map(node => {
      // title + url can appear on either the outside-metadata link or the thumbnail link
      const anchor =
        node.querySelector("h3 a.shortsLockupViewModelHostOutsideMetadataEndpoint") ||
        node.querySelector("a.shortsLockupViewModelHostEndpoint");

      const title = anchor?.getAttribute("title") || anchor?.textContent?.trim() || null;
      const videoUrl = toAbs(anchor?.getAttribute("href"));

      // thumbnail lives under ...ThumbnailContainer > img, with class shortsLockupViewModelHostThumbnail
      const img =
        node.querySelector("img.shortsLockupViewModelHostThumbnail") ||
        node.querySelector(".shortsLockupViewModelHostThumbnailContainer img") ||
        node.querySelector("img");

      const thumbnail = pickImgSrc(img);

      // views: prefer outside-metadata subhead text; fall back to old ariaLabel if present
      const viewsSpan =
        node.querySelector(".shortsLockupViewModelHostOutsideMetadataSubhead span") ||
        node.querySelector(".shortsLockupViewModelHostMetadataSubhead span");
      const views =
        viewsSpan?.textContent?.trim() ||
        viewsSpan?.ariaLabel ||
        node.querySelector(".shortsLockupViewModelHostMetadataSubhead")?.ariaLabel ||
        null;

      return { title, videoUrl, thumbnail, views };
    });

    return shortsLinks;
  };

  // works with lockups
  const getYoutubeSidebarVideosLinks = () => {
    const lockups = document.querySelectorAll("yt-lockup-view-model");

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
      const publishedDateEstimate = parseYoutubeTimestampToDate(published);

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



  // works with sidebar compact videos
  const getYoutubeSidebarVideosCompactLinks = function extractSidebarCompactVideoMetadataWithDates() {
    const videos = Array.from(document.querySelectorAll('ytd-compact-video-renderer'));

    function parseSimpleTimeAgoToDate(text) {
      const now = new Date();
      const [amount, unit] = text.toLowerCase().split(' ').filter(Boolean);
      const num = parseInt(amount);

      if (isNaN(num)) return null;

      const date = new Date(now);

      switch (unit) {
        case 'minute':
        case 'minutes':
          date.setMinutes(now.getMinutes() - num);
          break;
        case 'hour':
        case 'hours':
          date.setHours(now.getHours() - num);
          break;
        case 'day':
        case 'days':
          date.setDate(now.getDate() - num);
          break;
        case 'week':
        case 'weeks':
          date.setDate(now.getDate() - num * 7);
          break;
        case 'month':
        case 'months':
          date.setMonth(now.getMonth() - num);
          break;
        case 'year':
        case 'years':
          date.setFullYear(now.getFullYear() - num);
          break;
        default:
          return null;
      }

      return date.toISOString().split('T')[0]; // Return ISO date only (YYYY-MM-DD)
    }

    return videos.map(video => {
      const titleSpan = video.querySelector('#video-title');
      const title = titleSpan?.textContent.trim() || null;
      const videoUrl = video.querySelector('a#thumbnail')?.getAttribute('href') || null;
      const url = videoUrl ? `https://www.youtube.com${videoUrl}` : null;

      const thumbnail = video.querySelector('ytd-thumbnail img')?.src || null;

      const channelEl = video.querySelector('#channel-name yt-formatted-string');
      const channelName = channelEl?.textContent.trim() || null;
      const channelUrl = video.querySelector('#channel-name a')?.href || null;

      const isVerified = !!video.querySelector('#channel-name .badge-style-type-verified');

      const metadataItems = Array.from(video.querySelectorAll('#metadata-line .inline-metadata-item'))
        .map(el => el.textContent.trim());

      const views = metadataItems.find(text => text.includes('views')) || null;
      const publishedText = metadataItems.find(text => text.match(/\d+\s+\w+\s+ago/)) || null;
      const publishedDate = publishedText ? parseSimpleTimeAgoToDate(publishedText) : null;

      const duration = video.querySelector('ytd-thumbnail-overlay-time-status-renderer #text')?.textContent.trim() || null;

      const badges = Array.from(video.querySelectorAll('ytd-badge-supported-renderer'))
        .flatMap(badgeBlock =>
          Array.from(badgeBlock.querySelectorAll('div[aria-label]'))
            .map(badge => badge.getAttribute('aria-label'))
        );

      return {
        title,
        url,
        thumbnail,
        channel: {
          name: channelName,
          url: channelUrl,
          verified: isVerified
        },
        views,
        published: {
          text: publishedText,
          estimatedDate: publishedDate
        },
        duration,
        badges
      };
    });
  }




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

      const publishedDateEstimate = parseYoutubeTimestampToDate(publishedText);

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
        published: publishedText,
        publishedDateEstimate,
      };
      return json;
    })
    .filter(json => json.videoUrl !== 'https://www.youtube.comundefined')
    .map(json => {console.log(JSON.stringify(json, null, 2)); return json});

    return videoLinks;

  }



  var links = {
    videos: getYoutubeSidebarVideosLinks(),
    shorts: getYoutubeSidebarShortsLinks(),
  }

  if (!links.videos.length) {
    var links = {
      videos: getYoutubeSidebarVideosCompactLinks(),
      shorts: getYoutubeSidebarShortsLinks(),
    }
  }

  if (!links.videos.length) {
    var links = {
      videos: getHomePageRichLinks(),
      shorts: getHomePageShortsLinks()
    }
  }

  console.log(JSON.stringify(links, null, 2));
  copy(links);

})(); // Last edited 2025-08-15
