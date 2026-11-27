import { loadMedia, releaseMedia, storedMedia } from './media.js';
import { defaults, normalizeSettings } from './render.js';
import {pageScene,changePage} from './page-model.js';

export function itemId() {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

export function newProject(title = '', settings = { ...defaults }) {
  return { title, settings, items: [], active: 0, layout: 'matching', collageRatio: 'wide', photo: null, id: null };
}

export function sceneFor(project, index = project.pages?project.pageIndex:project.active) {
  if(project.pages)return pageScene(project,index);
  const item = project.items[index];
  const collage = project.layout === 'collage' && project.items.length > 1;
  const individual = project.layout === 'individual';
  return {
    settings: collage ? { ...project.settings, ratio: project.collageRatio } : individual ? item?.settings ?? project.settings : project.settings,
    source: collage ? project.items.map(entry => entry.source) : item?.source,
    photo: individual ? item?.photo ?? project.photo : project.photo,
  };
}

export function changeLayout(project, layout) {
  if (layout === project.layout) return project;
  if (layout === 'individual') {
    const items = project.items.map(item => item.settings ? item : { ...item, settings: { ...project.settings } });
    return { ...project, layout, items };
  }
  return { ...project, layout };
}

export function changeScene(project, patch, photo) {
  if(project.pages)return changePage(project,patch);
  if (project.layout === 'individual' && project.items[project.active]) {
    const items = project.items.map((item, index) => index === project.active
      ? { ...item, settings: { ...project.settings, ...item.settings, ...patch }, ...(photo ? { photo } : {}) }
      : item);
    return { ...project, items };
  }
  const { ratio, ...rest } = patch;
  const collage = project.layout === 'collage' && project.items.length > 1;
  return {
    ...project,
    settings: { ...project.settings, ...(collage ? rest : patch) },
    ...(ratio && collage ? { collageRatio: ratio } : {}),
    ...(photo ? { photo } : {}),
  };
}

export function ownedMedia(project) {
  return new Set([project.photo,...(project.pages??[]).map(page=>page.photo), ...project.items.flatMap(item => [item.source, item.photo])].filter(Boolean));
}

export async function saveProject(project) {
  const [photo, items, pages] = await Promise.all([
    storedMedia(project.photo),
    Promise.all(project.items.map(async item => ({
      ...item, source: await storedMedia(item.source), photo: await storedMedia(item.photo),
    }))),
    project.pages?Promise.all(project.pages.map(async page=>({...page,photo:await storedMedia(page.photo)}))):undefined,
  ]);
  return { ...project, photo, items,...(pages?{pages}:{} ) };
}

export async function loadProject(draft) {
  const restoreSettings=raw=>{const settings=normalizeSettings(raw);return settings.device==='flat'?{...settings,selectedLayerId:null}:settings;};
  const initial = newProject(draft.title);
  const items = draft.items ?? (draft.source ? [{ id: itemId(), source: draft.source }] : []);
  const loaded = new Set();
  async function open(info) {
    const media = await loadMedia(info);
    if (media) loaded.add(media);
    return media;
  }
  const results = await Promise.allSettled([
    open(draft.photo),
    ...items.flatMap(item => [open(item.source), open(item.photo)]),
    ...(draft.pages??[]).map(page=>open(page.photo)),
  ]);
  if (results.some(result => result.status === 'rejected')) {
    for (const media of loaded) releaseMedia(media);
    throw new Error('Could not open the draft.');
  }
  return {
    ...initial, id: draft.id, settings: restoreSettings(draft.settings),
    layout: draft.layout ?? initial.layout,
    active: Math.min(draft.active ?? 0, Math.max(0, items.length - 1)),
    collageRatio: draft.collageRatio ?? initial.collageRatio,
    ...(draft.pages?{pages:draft.pages.map((page,index)=>({...page,settings:normalizeSettings(page.settings),photo:results[1+items.length*2+index].value})),pageIndex:draft.pageIndex??0}:{}),
    photo: results[0].value,
    items: items.map((item, index) => ({
      id: item.id,
      source: results[index * 2 + 1].value,
      photo: results[index * 2 + 2].value,
      ...(item.settings ? { settings: restoreSettings(item.settings) } : {}),
    })),
  };
}
