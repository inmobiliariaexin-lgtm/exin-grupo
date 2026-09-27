'use client'

import { useState } from 'react'
import type { CreditBank, CreditContent } from '@/lib/credit-content'
import { saveCreditContentAction } from '@/app/admin/(private)/actions'
import styles from './credit-settings-form.module.css'

function newBank(): CreditBank {
  return { id: `entidad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: '', description: '', logoUrl: '', websiteUrl: '', buttonLabel: 'Conocer entidad', active: false }
}

export function CreditSettingsForm({ initialContent }: { initialContent: CreditContent }) {
  const [banks, setBanks] = useState(initialContent.banks)
  function updateBank(id: string, patch: Partial<CreditBank>) {
    setBanks((items) => items.map((bank) => bank.id === id ? { ...bank, ...patch } : bank))
  }

  return <form action={saveCreditContentAction} className={styles.form}>
    <section className="admin-panel">
      <div className="panel-title"><h2>Presentación de la página</h2></div>
      <div className="admin-form-grid">
        <label className="wide">Título principal<input name="title" defaultValue={initialContent.title} required maxLength={160} /></label>
        <label className="wide">Texto de introducción<textarea name="introduction" defaultValue={initialContent.introduction} rows={3} required maxLength={600} /></label>
        <label className="wide">Nota sobre condiciones y aprobación<textarea name="disclaimer" defaultValue={initialContent.disclaimer} rows={3} required maxLength={1000} /><small>Se mostrará para aclarar que cada banco define sus productos y condiciones.</small></label>
      </div>
    </section>

    <section className="admin-panel">
      <div className="panel-title"><div><h2>Entidades financieras</h2><span>Hasta 20 entidades; solo las activas aparecerán en la página.</span></div><button type="button" className="small-button" onClick={() => setBanks((items) => [...items, newBank()])} disabled={banks.length >= 20}>Agregar entidad</button></div>
      <input type="hidden" name="banks" value={JSON.stringify(banks)} />
      {banks.length === 0 && <p className={styles.empty}>Aún no agregas entidades. Usa “Agregar entidad” para configurar un banco o aliado financiero.</p>}
      <div className={styles.bankList}>
        {banks.map((bank, index) => <fieldset className={styles.bankCard} key={bank.id}>
          <legend>Entidad {index + 1}</legend>
          <div className={styles.bankHeading}>
            <strong>{bank.name || 'Nueva entidad'}</strong>
            <label className={styles.active}><input type="checkbox" checked={bank.active} onChange={(event) => updateBank(bank.id, { active: event.target.checked })} /> Mostrar en la página</label>
          </div>
          <div className="admin-form-grid">
            <label>Nombre del banco o entidad<input value={bank.name} onChange={(event) => updateBank(bank.id, { name: event.target.value })} maxLength={100} placeholder="Ej. Banco aliado" /></label>
            <label>Texto del enlace<input value={bank.buttonLabel} onChange={(event) => updateBank(bank.id, { buttonLabel: event.target.value })} maxLength={60} placeholder="Conocer entidad" /></label>
            <label className="wide">Descripción breve<textarea value={bank.description} onChange={(event) => updateBank(bank.id, { description: event.target.value })} rows={2} maxLength={300} placeholder="Describe la opción o servicio que ofrece." /></label>
            <label className="wide">URL del logo<input value={bank.logoUrl} onChange={(event) => updateBank(bank.id, { logoUrl: event.target.value })} maxLength={500} placeholder="Pega aquí la URL de la Biblioteca multimedia" /><small>Sube el logo en la Biblioteca multimedia de abajo y copia su URL. También puedes usar una imagen de /assets.</small></label>
            <label className="wide">Enlace de la entidad (opcional)<input value={bank.websiteUrl} onChange={(event) => updateBank(bank.id, { websiteUrl: event.target.value })} maxLength={500} placeholder="https://www.ejemplo.com" /></label>
          </div>
          {bank.logoUrl && <div className={styles.preview}><span>Vista previa del logo</span><img src={bank.logoUrl} alt={`Vista previa: ${bank.name || 'entidad financiera'}`} /></div>}
          <button type="button" className={styles.remove} onClick={() => setBanks((items) => items.filter((item) => item.id !== bank.id))}>Quitar entidad</button>
        </fieldset>)}
      </div>
      <button className="button" type="submit">Guardar configuración de créditos</button>
    </section>
  </form>
}
