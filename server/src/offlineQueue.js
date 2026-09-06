class OfflineQueue {
  constructor(io) {
    this.io = io;
    this.isOnline = true;
    this.queuedPackets = [];
    this.isFlushing = false;
    this.lastFlushedCount = 0;
  }

  setIo(io) {
    this.io = io;
  }

  handleIncomingTelemetry(packet) {
    if (!this.isOnline) {
      this.queuedPackets.push({
        ...packet,
        queuedAt: new Date().toISOString()
      });
      // Cap at 200 queued packets
      if (this.queuedPackets.length > 200) {
        this.queuedPackets.shift();
      }
    }
    return this.getStatus();
  }

  toggleOnline() {
    this.isOnline = !this.isOnline;

    if (this.isOnline && this.queuedPackets.length > 0) {
      this.flushQueue();
    } else {
      this.emitStatus();
    }

    return this.getStatus();
  }

  setOnline(state) {
    if (this.isOnline === state) return this.getStatus();
    this.isOnline = !!state;

    if (this.isOnline && this.queuedPackets.length > 0) {
      this.flushQueue();
    } else {
      this.emitStatus();
    }

    return this.getStatus();
  }

  flushQueue() {
    if (this.isFlushing) return;
    this.isFlushing = true;
    const totalToFlush = this.queuedPackets.length;
    this.lastFlushedCount = totalToFlush;

    // Simulate progressive flushing over 1.5 seconds
    const interval = setInterval(() => {
      if (this.queuedPackets.length > 0) {
        // Pop in batches of 3
        this.queuedPackets.splice(0, Math.min(3, this.queuedPackets.length));
        this.emitStatus();
      } else {
        clearInterval(interval);
        this.isFlushing = false;
        this.emitStatus();
        if (this.io) {
          this.io.emit('queue-sync-complete', {
            flushedCount: totalToFlush,
            syncedAt: new Date().toISOString()
          });
        }
      }
    }, 120);
  }

  getStatus() {
    return {
      isOnline: this.isOnline,
      queuedCount: this.queuedPackets.length,
      isFlushing: this.isFlushing,
      lastFlushedCount: this.lastFlushedCount
    };
  }

  emitStatus() {
    if (this.io) {
      this.io.emit('offline-queue-status', this.getStatus());
    }
  }
}

module.exports = OfflineQueue;
