import { redirect } from 'next/navigation'

/**
 * Contact page - redirects to the static contact.html file
 * This ensures /contact works as well as /contact.html
 */
export default function ContactPage() {
  redirect('/contact.html')
}


