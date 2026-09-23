insert into public.site_modules (module_key, content, enabled, sort_order)
values (
  'terms',
  jsonb_build_object(
    'title', 'Términos y condiciones de uso',
    'body', $terms$# 1. Aceptación y alcance
Estos términos describen el uso del sitio web de EXIN Grupo, sus páginas, el catálogo informativo de inmuebles y los formularios de contacto. El acceso y uso del portal se rige por estas condiciones; cualquier servicio u operación concreta puede requerir documentos separados. La versión definitiva debe identificar a la persona jurídica que opera el portal y sus canales de atención.

# 2. Información del operador
El portal se presenta bajo la marca EXIN Grupo. Antes de aprobar y publicar una versión definitiva, EXIN debe completar aquí la razón social del operador, su NIT, domicilio para notificaciones y los canales oficiales de servicio al cliente y recepción de peticiones, quejas y reclamos (PQR).

# 3. Información de inmuebles
Las fichas pueden describir ubicación, área, precio, características y disponibilidad con base en la información que recibe EXIN. Las condiciones pueden cambiar y un inmueble puede dejar de estar disponible. Antes de tomar una decisión, solicita al equipo la confirmación de la información y verifica los documentos y condiciones de la operación. La publicidad e información objetiva publicada se rige por las normas aplicables de protección al consumidor.

# 4. Consultas y solicitudes
Enviar un formulario permite que el equipo se comunique contigo para atender la consulta que enviaste. El envío no reserva un inmueble, no constituye por sí mismo una oferta aceptada, promesa de compraventa, contrato de arrendamiento, mandato ni compromiso de financiación. Cualquier operación requiere la revisión de sus condiciones y los documentos que correspondan con las partes involucradas.

# 5. Crédito y financiación
La información de crédito del portal es general y sirve para solicitar orientación. La evaluación, aprobación, tasas, plazos y demás condiciones dependen de la entidad financiera y del estudio individual. EXIN no garantiza que una solicitud de crédito sea aprobada ni reemplaza la información contractual de la entidad.

# 6. Aliados y enlaces externos
El sitio puede identificar aliados o enlazar servicios de terceros. Cada tercero responde por sus propios servicios, contenidos, condiciones y políticas. La presencia de un nombre o enlace no modifica las condiciones de una operación ni significa que EXIN controle sitios externos. EXIN debe verificar y describir correctamente cualquier relación comercial que anuncie.

# 7. Datos personales
El uso de datos enviados en los formularios se explica en la Política de tratamiento de datos personales. Consulta esa política antes de enviar tus datos. La autorización de tratamiento y tus derechos se rigen por la legislación colombiana aplicable.

# 8. Uso permitido y contenidos
Usa el sitio de forma lícita y no intentes acceder a cuentas, datos, sistemas o contenidos sin autorización; interferir con el servicio; cargar código malicioso; automatizar envíos abusivos; ni copiar o publicar fotografías, textos, marcas o fichas sin autorización. Los derechos sobre contenidos pertenecen a sus titulares.

# 9. Disponibilidad y cambios
EXIN puede actualizar el contenido, diseño y funciones del portal. Se procurará mantener la información clara y corregir errores cuando se detecten. Estas condiciones deben mostrar su versión y fecha vigentes; los cambios no eliminan derechos que la ley reconozca a las personas usuarias o consumidoras.

# 10. Ley aplicable y atención
El uso del portal se interpreta conforme a las leyes de Colombia. Nada en estos términos limita derechos irrenunciables de las personas consumidoras ni excluye responsabilidades que no puedan limitarse por ley. Para la versión definitiva, EXIN debe publicar un canal funcional de contacto y PQR y revisar el texto con su asesoría jurídica.$terms$,
    'approved', false,
    'version', 'borrador-2026-09'
  ),
  true,
  90
)
on conflict (module_key) do nothing;
