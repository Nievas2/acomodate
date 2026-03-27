import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calendar, Users, Clock, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="plastic-surface mx-4 mt-4 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">SyncUp</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="plastic-button">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button className="plastic-button">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Simple group scheduling</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Find the perfect time for{' '}
            <span className="text-primary">everyone</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
            Stop the endless back-and-forth. SyncUp helps groups visualize availability 
            and find meeting times that work for all.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="plastic-button px-8">
                Start scheduling free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="plastic-button px-8">
                Sign in to your account
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl w-full">
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Create Groups"
            description="Invite friends, colleagues, or teammates with a simple share link"
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Mark Your Time"
            description="Click and drag to mark when you&apos;re available, maybe, or busy"
          />
          <FeatureCard
            icon={<Clock className="w-6 h-6" />}
            title="See Overlap"
            description="Instantly visualize when everyone is free with color-coded grids"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-muted-foreground text-sm">
        <p>Built with care for better group coordination</p>
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
    <div className="plastic-surface p-6 space-y-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
