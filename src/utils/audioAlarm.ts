/**
 * Generador de sonido de alarma con síntesis de audio (Web Audio API)
 * Crea un timbre melódico de aviso de transporte público (tipo megafonía EMT/estación)
 */

class TransitAudioManager {
  private audioCtx: AudioContext | null = null;
  private ringingInterval: number | null = null;
  private isCurrentlyRinging = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Reproduce un acorde de campana/timbre de aviso de transporte
   */
  public playChime(): void {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Melodía de 4 notas de megafonía: E5 -> G#5 -> B5 -> E6
      const notes = [
        { freq: 659.25, time: 0.0, duration: 0.35, gain: 0.35 },
        { freq: 830.61, time: 0.18, duration: 0.35, gain: 0.4 },
        { freq: 987.77, time: 0.36, duration: 0.45, gain: 0.45 },
        { freq: 1318.51, time: 0.54, duration: 0.8, gain: 0.5 },
      ];

      notes.forEach(({ freq, time, duration, gain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Añadir segundo armónico suave para sonido de campana natural
        const osc2 = ctx.createOscillator();
        const gainNode2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 2, now + time);

        // Curva de ataque y decaimiento suave (tipo campana)
        gainNode.gain.setValueAtTime(0.001, now + time);
        gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

        gainNode2.gain.setValueAtTime(0.001, now + time);
        gainNode2.gain.exponentialRampToValueAtTime(gain * 0.25, now + time + 0.02);
        gainNode2.gain.exponentialRampToValueAtTime(0.0001, now + time + duration * 0.6);

        osc.connect(gainNode);
        osc2.connect(gainNode2);
        gainNode.connect(ctx.destination);
        gainNode2.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration);
        osc2.start(now + time);
        osc2.stop(now + time + duration);
      });

      // Si el navegador soporta vibración en móviles
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }
    } catch (e) {
      console.warn('AudioContext no disponible o bloqueado:', e);
    }
  }

  /**
   * Inicia el timbrado continuo de la alarma hasta que el usuario la detenga
   */
  public startAlarmRinging(): void {
    if (this.isCurrentlyRinging) return;
    this.isCurrentlyRinging = true;

    // Primer timbrado inmediato
    this.playChime();

    // Repetir cada 2.2 segundos
    this.ringingInterval = window.setInterval(() => {
      this.playChime();
    }, 2200);
  }

  /**
   * Detiene el timbrado de la alarma
   */
  public stopAlarmRinging(): void {
    this.isCurrentlyRinging = false;
    if (this.ringingInterval !== null) {
      clearInterval(this.ringingInterval);
      this.ringingInterval = null;
    }
  }

  public isRinging(): boolean {
    return this.isCurrentlyRinging;
  }
}

export const audioAlarm = new TransitAudioManager();

/**
 * Solicita permisos de notificación del navegador (para avisar con la pestaña minimizada)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Muestra notificación de sistema en el escritorio o móvil
 */
export function sendSystemNotification(title: string, body: string): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'emt-alarm',
      });
    } catch (e) {
      console.warn('Error mostrando notificación del sistema:', e);
    }
  }
}
