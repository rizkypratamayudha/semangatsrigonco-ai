'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Shepherd from 'shepherd.js'
import 'shepherd.js/dist/css/shepherd.css'

export default function OnboardingTour() {
  const router = useRouter()

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        classes: 'chattoko-tour-step shadow-2xl rounded-2xl border border-gray-100',
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: {
          enabled: true,
        },
      },
    })

    // Helper to wait for DOM element to load
    const waitForElement = (selector: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (document.querySelector(selector)) {
          resolve(true)
          return
        }
        const observer = new MutationObserver(() => {
          if (document.querySelector(selector)) {
            resolve(true)
            observer.disconnect()
          }
        })
        observer.observe(document.body, { childList: true, subtree: true })
        // Fallback timeout
        setTimeout(() => {
          observer.disconnect()
          resolve(!!document.querySelector(selector))
        }, 3000)
      })
    }

    // Helper to navigate client-side, wait for new page element, and show next step safely
    const navigateToPage = (url: string, targetSelector: string, stepId: string) => {
      // 1. Temporarily hide the current tour popover to prevent overlay shifts
      const currentStep = tour.getCurrentStep()
      if (currentStep) {
        currentStep.hide()
      }

      // 2. Perform smooth client-side transition
      router.push(url)

      // 3. Wait for the target element to load on the new page, then display the step
      waitForElement(targetSelector).then((exists) => {
        if (exists) {
          // Delay slightly (350ms) to allow Next.js animations/transitions to settle
          setTimeout(() => {
            tour.show(stepId)
          }, 350)
        }
      })
    }

    // Helper to ensure the widget creation form is open
    const ensureFormOpen = (): Promise<void> => {
      return new Promise((resolve) => {
        const formEl = document.getElementById('tour-create-form')
        if (!formEl) {
          const btn = document.getElementById('tour-create-widget') as HTMLButtonElement
          if (btn) btn.click()
        }
        setTimeout(resolve, 150)
      })
    }

    // Helper to ensure the widget creation form is closed
    const ensureFormClosed = (): Promise<void> => {
      return new Promise((resolve) => {
        const formEl = document.getElementById('tour-create-form')
        if (formEl) {
          const btn = document.getElementById('tour-create-widget') as HTMLButtonElement
          if (btn) btn.click()
        }
        setTimeout(resolve, 150)
      })
    }

    // Helper to skip a step if the target element does not exist
    const skipIfMissing = (selector: string, nextStepId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        if (document.querySelector(selector)) {
          resolve(true)
        } else {
          setTimeout(() => {
            tour.show(nextStepId)
          }, 0)
          resolve(false)
        }
      })
    }

    // 1. Welcome Step
    tour.addStep({
      id: 'welcome',
      title: 'Selamat Datang di ChatToko! 🤖',
      text: 'Mari ikuti panduan interaktif singkat ini untuk mempelajari cara menyiapkan chatbot AI Anda dalam beberapa langkah mudah.',
      attachTo: { element: '#tour-logo', on: 'right' },
      buttons: [
        {
          text: 'Mulai Tur',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 2. Navigasi ke Widgets
    tour.addStep({
      id: 'nav-widgets',
      title: 'Menu Chatbot ⚙️',
      text: 'Klik menu <strong>Widgets</strong> di sidebar untuk menuju ke pusat manajemen chatbot Anda.',
      attachTo: { element: '#tour-nav-widgets', on: 'right' },
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            navigateToPage('/dashboard/widgets', '#tour-create-widget', 'create-widget-btn')
          },
          classes: 'shepherd-button-primary',
        },
      ],
      when: {
        show: () => {
          const link = document.querySelector('#tour-nav-widgets')
          if (link) {
            const clickHandler = (e: Event) => {
              e.preventDefault()
              e.stopPropagation()
              link.removeEventListener('click', clickHandler)
              navigateToPage('/dashboard/widgets', '#tour-create-widget', 'create-widget-btn')
            }
            link.addEventListener('click', clickHandler)
            ;(link as any)._tourHandler = clickHandler
          }
        },
        hide: () => {
          const link = document.querySelector('#tour-nav-widgets')
          if (link && (link as any)._tourHandler) {
            link.removeEventListener('click', (link as any)._tourHandler)
          }
        }
      }
    })

    // 3. Tombol Buat Widget
    tour.addStep({
      id: 'create-widget-btn',
      title: 'Langkah 1: Buat Chatbot ➕',
      text: 'Klik tombol <strong>Buat Widget</strong> untuk membuka formulir pembuatan chatbot baru.',
      attachTo: { element: '#tour-create-widget', on: 'left' },
      beforeShowPromise: () => waitForElement('#tour-create-widget'),
      buttons: [
        {
          text: 'Kembali',
          action: () => {
            navigateToPage('/dashboard', '#tour-nav-widgets', 'nav-widgets')
          },
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            const btn = document.querySelector('#tour-create-widget') as HTMLButtonElement
            if (btn) btn.click()
            tour.show('form-name')
          },
          classes: 'shepherd-button-primary',
        },
      ],
      when: {
        show: () => {
          const btn = document.querySelector('#tour-create-widget')
          if (btn) {
            const handler = () => {
              btn.removeEventListener('click', handler)
              setTimeout(() => {
                tour.show('form-name')
              }, 150)
            }
            btn.addEventListener('click', handler)
            ;(btn as any)._tourHandler = handler
          }
        },
        hide: () => {
          const btn = document.querySelector('#tour-create-widget')
          if (btn && (btn as any)._tourHandler) {
            btn.removeEventListener('click', (btn as any)._tourHandler)
          }
        }
      }
    })

    // 4. Form - Nama Widget
    tour.addStep({
      id: 'form-name',
      title: 'Nama Chatbot 🏷️',
      text: 'Tulis nama chatbot di sini. Contoh: "CS Toko Online". Ini mempermudah identifikasi widget Anda.',
      attachTo: { element: '#tour-form-name', on: 'bottom' },
      beforeShowPromise: () => ensureFormOpen().then(() => waitForElement('#tour-form-name')),
      buttons: [
        {
          text: 'Kembali',
          action: () => {
            ensureFormClosed().then(() => tour.show('create-widget-btn'))
          },
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 5. Form - Warna Utama
    tour.addStep({
      id: 'form-color',
      title: 'Pilih Warna Utama 🎨',
      text: 'Tentukan warna tema gelembung dan header chat agar selaras dengan desain website Anda.',
      attachTo: { element: '#tour-form-color', on: 'bottom' },
      beforeShowPromise: () => ensureFormOpen().then(() => waitForElement('#tour-form-color')),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 6. Form - Pesan Sambutan
    tour.addStep({
      id: 'form-welcome',
      title: 'Pesan Sambutan 👋',
      text: 'Tulis pesan sambutan otomatis yang akan dikirim chatbot saat pengunjung pertama kali membuka gelembung chat.',
      attachTo: { element: '#tour-form-welcome', on: 'bottom' },
      beforeShowPromise: () => ensureFormOpen().then(() => waitForElement('#tour-form-welcome')),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 7. Form - Prompt AI
    tour.addStep({
      id: 'form-prompt',
      title: 'Instruksi AI (Prompt) 🧠',
      text: 'Berikan panduan atau instruksi perilaku untuk AI. Misalnya: "Jadilah customer service yang ramah dan sopan."',
      attachTo: { element: '#tour-form-prompt', on: 'bottom' },
      beforeShowPromise: () => ensureFormOpen().then(() => waitForElement('#tour-form-prompt')),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 8. Form - Submit Button
    tour.addStep({
      id: 'form-submit',
      title: 'Simpan & Buat 💾',
      text: 'Klik tombol <strong>Buat Widget</strong> untuk menyimpan chatbot baru Anda ke database.',
      attachTo: { element: '#tour-form-submit', on: 'bottom' },
      beforeShowPromise: () => ensureFormOpen().then(() => waitForElement('#tour-form-submit')),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            ensureFormClosed().then(() => tour.next())
          },
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 9. Kelola Dokumen
    tour.addStep({
      id: 'doc-manage',
      title: 'Langkah 2: Unggah Dokumen RAG 📄',
      text: 'Klik tombol <strong>Kelola Dokumen</strong> untuk mengunggah file panduan (.pdf/.txt) agar jawaban AI akurat sesuai basis pengetahuan bisnis Anda.',
      attachTo: { element: '#tour-doc-manage', on: 'bottom' },
      beforeShowPromise: () => ensureFormClosed().then(() => skipIfMissing('#tour-doc-manage', 'nav-analytics')),
      buttons: [
        {
          text: 'Kembali',
          action: () => {
            ensureFormOpen().then(() => tour.show('form-submit'))
          },
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            const btn = document.querySelector('#tour-doc-manage') as HTMLButtonElement
            if (btn) btn.click()
            tour.show('preview-widget')
          },
          classes: 'shepherd-button-primary',
        },
      ],
      when: {
        show: () => {
          const btn = document.querySelector('#tour-doc-manage')
          if (btn) {
            const handler = () => {
              btn.removeEventListener('click', handler)
              setTimeout(() => {
                tour.show('preview-widget')
              }, 150)
            }
            btn.addEventListener('click', handler)
            ;(btn as any)._tourHandler = handler
          }
        },
        hide: () => {
          const btn = document.querySelector('#tour-doc-manage')
          if (btn && (btn as any)._tourHandler) {
            btn.removeEventListener('click', (btn as any)._tourHandler)
          }
        }
      }
    })

    // 10. Preview Widget
    tour.addStep({
      id: 'preview-widget',
      title: 'Langkah 3: Preview & Uji Coba 🔍',
      text: 'Gunakan tombol <strong>Preview</strong> (ikon mata) ini untuk mencoba langsung obrolan dengan AI Anda di dashboard.',
      attachTo: { element: '#tour-preview-widget', on: 'bottom' },
      beforeShowPromise: () => skipIfMissing('#tour-preview-widget', 'nav-analytics'),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 11. Salin Kode Embed
    tour.addStep({
      id: 'copy-embed',
      title: 'Langkah 4: Salin Kode Embed 💻',
      text: 'Klik tombol <strong>Kode Embed</strong> untuk menyalin tag `<script>`. Tempel di kode HTML website Anda agar tombol chat otomatis muncul di sudut kanan bawah.',
      attachTo: { element: '#tour-copy-embed', on: 'bottom' },
      beforeShowPromise: () => skipIfMissing('#tour-copy-embed', 'nav-analytics'),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 12. Navigasi ke Analytics
    tour.addStep({
      id: 'nav-analytics',
      title: 'Menu Analytics 📊',
      text: 'Klik menu <strong>Analytics</strong> di sidebar untuk memantau grafik percakapan dan ringkasan pertanyaan pelanggan.',
      attachTo: { element: '#tour-nav-analytics', on: 'right' },
      buttons: [
        {
          text: 'Kembali',
          action: () => {
            if (document.querySelector('#tour-widget-card')) {
              tour.show('copy-embed')
            } else {
              tour.show('create-widget-btn')
            }
          },
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            navigateToPage('/dashboard/analytics', '#tour-analytics-summary', 'analytics-summary')
          },
          classes: 'shepherd-button-primary',
        },
      ],
      when: {
        show: () => {
          const link = document.querySelector('#tour-nav-analytics')
          if (link) {
            const clickHandler = (e: Event) => {
              e.preventDefault()
              e.stopPropagation()
              link.removeEventListener('click', clickHandler)
              navigateToPage('/dashboard/analytics', '#tour-analytics-summary', 'analytics-summary')
            }
            link.addEventListener('click', clickHandler)
            ;(link as any)._tourHandler = clickHandler
          }
        },
        hide: () => {
          const link = document.querySelector('#tour-nav-analytics')
          if (link && (link as any)._tourHandler) {
            link.removeEventListener('click', (link as any)._tourHandler)
          }
        }
      }
    })

    // 13. Analytics Summary
    tour.addStep({
      id: 'analytics-summary',
      title: 'Tren & Statistik Percakapan 📈',
      text: 'Di sini Anda dapat melihat total percakapan, jumlah pesan masuk, serta rata-rata interaksi harian.',
      attachTo: { element: '#tour-analytics-summary', on: 'bottom' },
      beforeShowPromise: () => waitForElement('#tour-analytics-summary'),
      buttons: [
        {
          text: 'Kembali',
          action: () => {
            navigateToPage('/dashboard/widgets', '#tour-nav-analytics', 'nav-analytics')
          },
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 14. Analytics Popular Questions
    tour.addStep({
      id: 'analytics-popular',
      title: 'Pertanyaan Terpopuler ❓',
      text: 'Ketahui daftar pertanyaan paling sering diajukan oleh pengunjung untuk mengoptimalkan basis data Anda.',
      attachTo: { element: '#tour-analytics-popular', on: 'top' },
      beforeShowPromise: () => waitForElement('#tour-analytics-popular'),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 15. Analytics Keywords
    tour.addStep({
      id: 'analytics-keywords',
      title: 'Kata Kunci Terpopuler 🏷️',
      text: 'Pantau tren topik hangat dan kata kunci dominan yang sedang dibahas oleh pengunjung website.',
      attachTo: { element: '#tour-analytics-keywords', on: 'top' },
      beforeShowPromise: () => waitForElement('#tour-analytics-keywords'),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 16. Navigasi ke Settings
    tour.addStep({
      id: 'nav-settings',
      title: 'Menu Pengaturan ⚙️',
      text: 'Klik menu <strong>Pengaturan</strong> di sidebar untuk mengelola akun dan langganan Anda.',
      attachTo: { element: '#tour-nav-settings', on: 'right' },
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            navigateToPage('/dashboard/settings', '#tour-settings-billing', 'settings-billing')
          },
          classes: 'shepherd-button-primary',
        },
      ],
      when: {
        show: () => {
          const link = document.querySelector('#tour-nav-settings')
          if (link) {
            const clickHandler = (e: Event) => {
              e.preventDefault()
              e.stopPropagation()
              link.removeEventListener('click', clickHandler)
              navigateToPage('/dashboard/settings', '#tour-settings-billing', 'settings-billing')
            }
            link.addEventListener('click', clickHandler)
            ;(link as any)._tourHandler = clickHandler
          }
        },
        hide: () => {
          const link = document.querySelector('#tour-nav-settings')
          if (link && (link as any)._tourHandler) {
            link.removeEventListener('click', (link as any)._tourHandler)
          }
        }
      }
    })

    // 17. Settings Billing Tab
    tour.addStep({
      id: 'settings-billing',
      title: 'Tab Langganan & Billing 💳',
      text: 'Klik tab <strong>Langganan</strong> untuk masuk ke pengaturan kuota pesan dan metode pembayaran.',
      attachTo: { element: '#tour-settings-billing', on: 'right' },
      beforeShowPromise: () => waitForElement('#tour-settings-billing'),
      buttons: [
        {
          text: 'Kembali',
          action: () => {
            navigateToPage('/dashboard/analytics', '#tour-nav-settings', 'nav-settings')
          },
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: () => {
            const btn = document.querySelector('#tour-settings-billing') as HTMLButtonElement
            if (btn) btn.click()
            tour.show('billing-card-pro')
          },
          classes: 'shepherd-button-primary',
        },
      ],
      when: {
        show: () => {
          const btn = document.querySelector('#tour-settings-billing')
          if (btn) {
            const handler = () => {
              btn.removeEventListener('click', handler)
              setTimeout(() => {
                tour.show('billing-card-pro')
              }, 150)
            }
            btn.addEventListener('click', handler)
            ;(btn as any)._tourHandler = handler
          }
        },
        hide: () => {
          const btn = document.querySelector('#tour-settings-billing')
          if (btn && (btn as any)._tourHandler) {
            btn.removeEventListener('click', (btn as any)._tourHandler)
          }
        }
      }
    })

    // 18. Upgrade Paket Billing
    tour.addStep({
      id: 'billing-card-pro',
      title: 'Upgrade Paket Billing 🚀',
      text: 'Lakukan upgrade kuota chat bulanan secara instan melalui pembayaran Midtrans Snap di sini.',
      attachTo: { element: '#tour-billing-card-pro', on: 'left' },
      beforeShowPromise: () => waitForElement('#tour-billing-card-pro'),
      buttons: [
        {
          text: 'Kembali',
          action: tour.back,
          classes: 'shepherd-button-secondary',
        },
        {
          text: 'Lanjut',
          action: tour.next,
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // 19. Selesai
    tour.addStep({
      id: 'finish',
      title: 'Panduan Selesai! 🎉',
      text: 'Luar biasa! Sekarang Anda telah siap menggunakan ChatToko secara optimal. Klik tombol <strong>Mulai Panduan Baru</strong> di sidebar kapan saja jika ingin mengulang tur ini.',
      attachTo: { element: '#tour-start-btn', on: 'top' },
      beforeShowPromise: () => waitForElement('#tour-start-btn'),
      buttons: [
        {
          text: 'Selesai',
          action: () => {
            tour.complete()
          },
          classes: 'shepherd-button-primary',
        },
      ],
    })

    // Auto run on first login
    const hasCompletedTour = localStorage.getItem('chattoko_tour_completed')
    if (!hasCompletedTour) {
      setTimeout(() => {
        tour.start()
        localStorage.setItem('chattoko_tour_completed', 'true')
      }, 1000)
    }

    // Listen to custom start tour event
    const handleStartTour = () => {
      tour.start()
    }
    window.addEventListener('start-onboarding-tour', handleStartTour)

    return () => {
      window.removeEventListener('start-onboarding-tour', handleStartTour)
      tour.complete()
    }
  }, [router])

  return (
    <style jsx global>{`
      /* Premium Shepherd Custom Styling */
      .shepherd-element {
        background: #ffffff !important;
        border-radius: 18px !important;
        border: 1px solid #f3f4f6 !important;
        font-family: inherit !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
        max-width: 360px !important;
        padding: 8px !important;
        outline: none !important;
      }
      .shepherd-content {
        padding: 0 !important;
      }
      .shepherd-header {
        background: transparent !important;
        padding: 12px 16px 4px 16px !important;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .shepherd-title {
        color: #111827 !important;
        font-size: 16px !important;
        font-weight: 700 !important;
        line-height: 1.4 !important;
      }
      .shepherd-text {
        color: #4b5563 !important;
        font-size: 13.5px !important;
        line-height: 1.6 !important;
        padding: 8px 16px 16px 16px !important;
      }
      .shepherd-footer {
        background: transparent !important;
        padding: 0 16px 12px 16px !important;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .shepherd-button-primary {
        background: #25d366 !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        padding: 8px 16px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 2px 4px rgba(37, 211, 102, 0.2) !important;
      }
      .shepherd-button-primary:hover {
        background: #128c7e !important;
        transform: translateY(-0.5px);
      }
      .shepherd-button-secondary {
        background: #f3f4f6 !important;
        color: #4b5563 !important;
        border: none !important;
        border-radius: 12px !important;
        font-size: 12.5px !important;
        font-weight: 600 !important;
        padding: 8px 16px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      .shepherd-button-secondary:hover {
        background: #e5e7eb !important;
        color: #1f2937 !important;
      }
      .shepherd-cancel-icon {
        color: #9ca3af !important;
        font-size: 22px !important;
        font-weight: 300 !important;
        transition: color 0.15s ease !important;
        background: none !important;
        border: none !important;
        cursor: pointer !important;
      }
      .shepherd-cancel-icon:hover {
        color: #ef4444 !important;
      }
      /* Dim overlay styling */
      .shepherd-modal-overlay-container {
        opacity: 0.45 !important;
      }
    `}</style>
  )
}
