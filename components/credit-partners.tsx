import styles from './credit-partners.module.css'
import type { CreditBank } from '@/lib/credit-content'

export function CreditPartners({ banks }: { banks: CreditBank[] }) {
  if (!banks.length) return null
  return <section className={`${styles.section} credit-bank-section`} aria-labelledby="credit-partners-title">
    <div className={styles.heading}><p className="eyebrow dark">OPCIONES PARA CONOCER</p><h2 id="credit-partners-title">Entidades financieras</h2><p>Explora la información de cada entidad y solicita orientación al equipo EXIN.</p></div>
    <div className={styles.grid}>
      {banks.map((bank) => <article className={styles.card} key={bank.id}>
        <div className={styles.logoFrame}>{bank.logoUrl ? <img src={bank.logoUrl} alt={`Logo de ${bank.name}`} /> : <span aria-hidden="true">{bank.name.slice(0, 1).toLocaleUpperCase()}</span>}</div>
        <div className={styles.copy}><h3>{bank.name}</h3>{bank.description && <p>{bank.description}</p>}{bank.websiteUrl && <a className={styles.link} href={bank.websiteUrl} target="_blank" rel="noopener noreferrer">{bank.buttonLabel || 'Conocer entidad'} <span aria-hidden="true">↗</span></a>}</div>
      </article>)}
    </div>
  </section>
}
