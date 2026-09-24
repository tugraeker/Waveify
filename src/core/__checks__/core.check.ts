// src/core/__checks__/core.check.ts (tsc fixture, kept per plan)
import { useUserStore } from '../../stores/userStore';
import { useUiStore } from '../../stores/uiStore';
const u = useUserStore.getState(); u.signIn; u.signOut;
const t = useUiStore.getState(); t.toast('hi');
export {};
