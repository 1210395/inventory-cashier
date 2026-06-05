<template>
  <!-- POS-style category drill-down: breadcrumb + current level tiles.
       v-model is the array of effective category uuids (selected + all its
       descendants); empty array means "All". -->
  <div class="space-y-2">
    <div class="flex items-center gap-1 flex-wrap text-sm">
      <button
        type="button"
        class="crumb"
        :class="catPath.length ? 'crumb-link' : 'crumb-cur'"
        @click="goToLevel(-1)"
      >{{ t('all') }}</button>
      <template v-for="(c, i) in catPath" :key="c.uuid">
        <span class="opacity-40">{{ isRtl ? '‹' : '›' }}</span>
        <button
          type="button"
          class="crumb"
          :class="i === catPath.length - 1 ? 'crumb-cur' : 'crumb-link'"
          @click="goToLevel(i)"
        >{{ localizedName(c) }}</button>
      </template>
    </div>
    <div v-if="currentCategories.length" class="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-6 gap-2">
      <button
        v-for="cat in currentCategories"
        :key="cat.uuid"
        type="button"
        class="cat-tile"
        :class="selectedUuid === cat.uuid ? 'cat-on' : 'cat-off'"
        @click="drillInto(cat)"
      >
        <span class="truncate">{{ localizedName(cat) }}</span>
        <span v-if="hasChildren(cat)" class="cat-caret">{{ isRtl ? '‹' : '›' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { t, isRtl, localizedName } from '../../i18n/index.js';

const props = defineProps({
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const selectedUuid = ref('');
const catPath = ref([]); // breadcrumb of drilled-into categories

const topCategories = computed(() => props.categories.filter((c) => !c.parent_uuid));
function hasChildren(cat) {
  return props.categories.some((c) => c.parent_uuid === cat.uuid);
}
// Categories shown at the current drill level: children of the last crumb,
// or the top-level categories when at the root.
const currentCategories = computed(() => {
  const parent = catPath.value[catPath.value.length - 1];
  return parent
    ? props.categories.filter((c) => c.parent_uuid === parent.uuid)
    : topCategories.value;
});
// All descendants of a category (so a parent matches everything beneath it).
function descendantUuids(uuid) {
  const seen = new Set([uuid]);
  let frontier = [uuid];
  while (frontier.length) {
    const next = [];
    for (const c of props.categories) {
      if (c.parent_uuid && frontier.includes(c.parent_uuid) && !seen.has(c.uuid)) {
        seen.add(c.uuid);
        next.push(c.uuid);
      }
    }
    frontier = next;
  }
  return [...seen];
}
function emitSelection() {
  emit('update:modelValue', selectedUuid.value ? descendantUuids(selectedUuid.value) : []);
}
// Tap a category: filter by it (+ all descendants) and, if it has children,
// drill one level deeper so the user can keep narrowing.
function drillInto(cat) {
  selectedUuid.value = cat.uuid;
  if (hasChildren(cat)) catPath.value = [...catPath.value, cat];
  emitSelection();
}
function goToLevel(index) {
  if (index < 0) {
    catPath.value = [];
    selectedUuid.value = '';
  } else {
    catPath.value = catPath.value.slice(0, index + 1);
    selectedUuid.value = catPath.value[index]?.uuid || '';
  }
  emitSelection();
}
</script>

<style scoped>
.cat-tile {
  min-height: 56px;
  border-radius: 14px;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  border: 1px solid transparent;
  transition: transform .06s ease, filter .12s ease;
}
.cat-tile:active { transform: scale(.97); filter: brightness(.95); }
.cat-on { background: #D4A843; color: #1a1a1a; box-shadow: 0 2px 8px rgba(212,168,67,.4); }
.cat-off { background: #f3f4f6; color: #374151; }
:global(.dark) .cat-off { background: #374151; color: #e5e7eb; }
.cat-caret { font-size: 16px; opacity: .7; font-weight: 700; }

.crumb { padding: 6px 10px; border-radius: 8px; font-weight: 600; min-height: 36px; }
.crumb-cur { background: #D4A843; color: #1a1a1a; }
.crumb-link { background: #f3f4f6; color: #374151; }
:global(.dark) .crumb-link { background: #374151; color: #e5e7eb; }
</style>
