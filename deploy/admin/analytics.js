'use strict';

function getClientIp(req) {
  const forwarded = req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']);
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  if (req.ip) return req.ip;
  if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
  return 'unknown';
}

function getBrowserName(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('msie') || ua.includes('trident')) return 'IE';
  return 'Otro';
}

function getDeviceName(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase();
  if (ua.includes('mobile')) return 'Móvil';
  if (ua.includes('tablet')) return 'Tablet';
  return 'Desktop';
}

function getOsName(userAgent = '') {
  const ua = String(userAgent || '').toLowerCase();
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  return 'Otro';
}

function getReferer(req) {
  const referer = req.headers && (req.headers.referer || req.headers.referrer);
  return typeof referer === 'string' ? referer : 'directo';
}

function getVisitorId(req) {
  const cookieHeader = req.headers && (req.headers.cookie || req.headers.Cookie || '');
  const match = String(cookieHeader).match(/sr_visitor_id=([^;]+)/);
  if (match && match[1]) return decodeURIComponent(match[1]);
  const visitorId = `visitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (req.res && typeof req.res.cookie === 'function') {
    req.res.cookie('sr_visitor_id', visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  return visitorId;
}

function buildAnalyticsState() {
  return {
    totals: {
      pageViews: 0,
      uniqueVisitors: 0,
      activeVisitors: 0,
      votes: 0,
      averageRating: 0,
    },
    visitors: {},
    pageViews: [],
    votes: [],
    lastUpdated: new Date().toISOString(),
  };
}

function pruneVisitors(state, now = Date.now(), ttlMs = 5 * 60 * 1000) {
  const entries = Object.entries(state.visitors || {});
  const activeEntries = {};
  entries.forEach(([key, value]) => {
    if (now - value.lastSeen <= ttlMs) {
      activeEntries[key] = value;
    }
  });
  state.visitors = activeEntries;
  state.totals.activeVisitors = Object.keys(activeEntries).length;
}

function recordVisit(state, req, path) {
  const now = Date.now();
  const ip = getClientIp(req);
  const browser = getBrowserName(req.get ? req.get('user-agent') : '');
  const device = getDeviceName(req.get ? req.get('user-agent') : '');
  const os = getOsName(req.get ? req.get('user-agent') : '');
  const referer = getReferer(req);
  const visitorId = getVisitorId(req);
  const key = `${visitorId}|${ip}|${browser}`;
  pruneVisitors(state, now);
  const existing = state.visitors[key];
  if (!existing) {
    state.totals.uniqueVisitors += 1;
  }
  state.visitors[key] = {
    ip,
    browser,
    device,
    os,
    visitorId,
    lastSeen: now,
    path,
    count: (existing && existing.count ? existing.count : 0) + 1,
  };
  state.totals.pageViews += 1;
  state.totals.activeVisitors = Object.keys(state.visitors).length;
  state.pageViews.push({
    ts: new Date(now).toISOString(),
    path,
    ip,
    browser,
    device,
    os,
    referer,
    visitorId,
  });
  state.pageViews = state.pageViews.slice(-1000);
  state.lastUpdated = new Date(now).toISOString();
  return {
    totalPageViews: state.totals.pageViews,
    uniqueVisitors: state.totals.uniqueVisitors,
    activeVisitors: state.totals.activeVisitors,
  };
}

function recordVote(state, itemType, itemId, rating, req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const browser = getBrowserName(req.get ? req.get('user-agent') : '');
  const visitorId = getVisitorId(req);
  const key = `${itemType}:${itemId}:${visitorId}:${browser}:${ip}`;
  const existing = (state.votes || []).find((vote) => vote.identityKey === key);
  if (existing) {
    return {
      ok: false,
      duplicate: true,
      summary: buildItemVoteSummary(state, itemType, itemId),
      vote: existing,
    };
  }
  const vote = {
    id: `vote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    itemType,
    itemId,
    rating: Number(rating),
    browser,
    ip,
    visitorId,
    ts: new Date(now).toISOString(),
    identityKey: key,
  };
  state.votes.push(vote);
  state.votes = state.votes.slice(-1000);
  state.totals.votes = state.votes.length;
  state.totals.averageRating = buildAverageRating(state.votes);
  state.lastUpdated = new Date(now).toISOString();
  return {
    ok: true,
    vote,
    summary: buildItemVoteSummary(state, itemType, itemId),
  };
}

function buildAverageRating(votes) {
  if (!votes || !votes.length) return 0;
  const sum = votes.reduce((acc, vote) => acc + Number(vote.rating || 0), 0);
  return Number((sum / votes.length).toFixed(2));
}

function buildItemVoteSummary(state, itemType, itemId) {
  const votes = (state.votes || []).filter((vote) => vote.itemType === itemType && vote.itemId === itemId);
  const averageRating = votes.length ? Number((votes.reduce((acc, vote) => acc + Number(vote.rating || 0), 0) / votes.length).toFixed(2)) : 0;
  return {
    totalVotes: votes.length,
    averageRating,
    browsers: Array.from(new Set(votes.map((vote) => vote.browser))).sort(),
    lastVotedAt: votes.length ? votes[votes.length - 1].ts : null,
  };
}

function summarizeByField(items, fieldName) {
  const counts = {};
  items.forEach((entry) => {
    const value = entry[fieldName] || 'Otro';
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count }));
}

function buildTimeline(state, days = 7) {
  const now = Date.now();
  const buckets = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - i);
    buckets.push({
      label: date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      views: 0,
      votes: 0,
    });
  }
  (state.pageViews || []).forEach((entry) => {
    const ts = new Date(entry.ts);
    const key = ts.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const bucket = buckets.find((item) => item.label === key);
    if (bucket) bucket.views += 1;
  });
  (state.votes || []).forEach((entry) => {
    const ts = new Date(entry.ts);
    const key = ts.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const bucket = buckets.find((item) => item.label === key);
    if (bucket) bucket.votes += 1;
  });
  return buckets;
}

function buildAnalyticsSummary(state, entities = {}, activityLogs = [], reviews = []) {
  const overview = {
    totalPageViews: state.totals.pageViews || 0,
    uniqueVisitors: state.totals.uniqueVisitors || 0,
    activeVisitors: state.totals.activeVisitors || 0,
    totalVotes: state.totals.votes || 0,
    averageRating: state.totals.averageRating || 0,
  };
  const byType = {};
  const typeMap = {
    alojamientos: 'alojamiento',
    gastronomia: 'gastronomia',
    eventos: 'evento',
  };
  const collectionNames = ['alojamientos', 'gastronomia', 'eventos'];
  const contentAudit = {};
  collectionNames.forEach((collectionName) => {
    const items = entities[collectionName] || [];
    const itemType = typeMap[collectionName] || collectionName;
    const normalizedItems = (items || []).map((item) => ({
      ...item,
      voteStats: buildItemVoteSummary(state, itemType, item.id),
    }));
    byType[collectionName] = normalizedItems;
    contentAudit[collectionName] = {
      total: normalizedItems.length,
      pending: normalizedItems.filter((item) => !item.mainImg || !item.descripcionLarga && !item.descripcion || !item.titulo && !item.nombre).length,
      recent: normalizedItems.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)).slice(0, 5),
    };
  });
  const deviceStats = summarizeByField(state.pageViews || [], 'device');
  const browserStats = summarizeByField(state.pageViews || [], 'browser');
  const osStats = summarizeByField(state.pageViews || [], 'os');
  const trafficSources = summarizeByField((state.pageViews || []).filter((entry) => entry.referer), 'referer');
  const recentActivity = (activityLogs || []).slice(0, 8);
  const reviewEntries = Array.isArray(reviews) ? reviews : [];
  const approvedReviews = reviewEntries.filter((entry) => entry.status === 'approved');
  const pendingReviews = reviewEntries.filter((entry) => entry.status !== 'approved');
  const topVisited = (state.pageViews || []).slice(-10).reverse().map((entry) => ({
    path: entry.path,
    count: 1,
    ts: entry.ts,
  }));
  const upcomingEvents = (entities.eventos || [])
    .filter((entry) => entry.fecha)
    .map((entry) => ({ ...entry, date: new Date(entry.fecha) }))
    .filter((entry) => entry.date >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(0, 5);
  const pendingContent = Object.values(contentAudit).reduce((acc, item) => acc + (item.pending || 0), 0);
  return {
    overview,
    byType,
    timeline: buildTimeline(state),
    timelineWeekly: buildTimeline(state, 7),
    timelineMonthly: buildTimeline(state, 30),
    deviceStats,
    browserStats,
    osStats,
    trafficSources,
    recentActivity,
    topVisited,
    contentAudit,
    upcomingEvents,
    totalContent: collectionNames.reduce((acc, name) => acc + (entities[name] || []).length, 0),
    pendingContent,
    reviewSummary: {
      total: reviewEntries.length,
      pending: pendingReviews.length,
      approved: approvedReviews.length,
    },
  };
}

module.exports = {
  buildAnalyticsState,
  getClientIp,
  getBrowserName,
  getDeviceName,
  getOsName,
  getReferer,
  getVisitorId,
  recordVisit,
  recordVote,
  buildAnalyticsSummary,
  buildItemVoteSummary,
};
