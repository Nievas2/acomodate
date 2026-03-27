import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Clock, Sparkles } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="plastic-surface mx-4 mt-4 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Acomodate</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="plastic-button">
              Iniciar sesión
            </Button>
          </Link>
          <Link href="/register">
            <Button className="plastic-button">Registrarse</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Programación de grupos sencilla</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Encuentra el mejor horario para{" "}
            <span className="text-primary">todos</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Se acabaron las idas y venidas interminables. Acomodate ayuda a los
            grupos a visualizar la disponibilidad y encontrar horarios de
            reunión que funcionen para todos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="plastic-button px-8">
                Comienza ahora
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="plastic-button px-8"
              >
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full">
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Crear Grupos"
            description="Invita a amigos, colegas o compañeros de equipo con un simple enlace para compartir."
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Reserva tu horario"
            description="Haz clic y arrastra para marcar cuándo estás disponible, quizás o ocupado."
          />
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="Visualizar disponibilidad"
            description="Visualiza al instante cuándo todos están libres con cuadrículas codificadas por colores."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-muted-foreground text-sm">
        <p>Diseñado con esmero para una mejor coordinación del grupo.</p>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="plastic-surface p-6 space-y-4 hover:-translate-y-5 hover:border-primary hover:shadow-2xl transition-all duration-150">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
