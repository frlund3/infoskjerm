import { InternalNewsModule } from './internal-news'
import { EmergencyMessageModule } from './emergency-message'
import { ShiftScheduleModule } from './shift-schedule'
import { EmployeeSpotlightModule } from './employee-spotlight'
import { TrainingMaterialModule } from './training-material'
import { ProductOfferModule } from './product-offer'
import { CompetitionModule } from './competition'
import { SalesStatsModule } from './sales-stats'
import { WeatherModule } from './weather-module'
import { CompanyInfoModule } from './company-info'
import { LunchMenuModule } from './lunch-menu'
import { SlideModule } from './slide-module'
import { VideoModule } from './video-module'
import { NewsFeedModule } from './news-feed-module'
import { InstagramWallModule } from './instagram-wall-module'
import { GoogleReviewsModule } from './google-reviews-module'
import { TriviaQuizModule } from './trivia-quiz-module'
import { LoyaltyProgramModule } from './loyalty-program-module'
import { CountdownTimerModule } from './countdown-timer-module'
import { QueueStatusModule } from './queue-status-module'
import { BirthdayAnnouncementModule } from './birthday-announcement-module'
import { ProductSpotlightModule } from './product-spotlight-module'
import { SeasonalItemsModule } from './seasonal-items-module'
import { CustomUrlModule } from './custom-url-module'
import { SustainabilityInfoModule } from './sustainability-info-module'
import { NewsTickerModule } from './news-ticker-module'
import { PowerBIModule } from './powerbi-module'
import { PlectoModule } from './plecto-module'
import { DataSourceModule } from './data-source-module'

interface ModuleRendererProps {
  moduleKey: string
  fields: Record<string, unknown>
}

export function ModuleRenderer({ moduleKey, fields }: ModuleRendererProps) {
  switch (moduleKey) {
    case 'internal-news': return <InternalNewsModule fields={fields} />
    case 'emergency-message': return <EmergencyMessageModule fields={fields} />
    case 'shift-schedule': return <ShiftScheduleModule fields={fields} />
    case 'employee-spotlight': return <EmployeeSpotlightModule fields={fields} />
    case 'training-material': return <TrainingMaterialModule fields={fields} />
    case 'product-offer': return <ProductOfferModule fields={fields} />
    case 'competition': return <CompetitionModule fields={fields} />
    case 'sales-stats': return <SalesStatsModule fields={fields} />
    case 'weather': return <WeatherModule fields={fields} />
    case 'company-info': return <CompanyInfoModule fields={fields} />
    case 'lunch-menu': return <LunchMenuModule fields={fields} />
    case 'slide': return <SlideModule fields={fields} />
    case 'video': return <VideoModule fields={fields} />
    case 'news-feed': return <NewsFeedModule fields={fields} />
    case 'instagram-wall': return <InstagramWallModule fields={fields} />
    case 'google-reviews': return <GoogleReviewsModule fields={fields} />
    case 'trivia-quiz': return <TriviaQuizModule fields={fields} />
    case 'loyalty-program': return <LoyaltyProgramModule fields={fields} />
    case 'countdown-timer': return <CountdownTimerModule fields={fields} />
    case 'queue-status': return <QueueStatusModule fields={fields} />
    case 'birthday-announcement': return <BirthdayAnnouncementModule fields={fields} />
    case 'product-spotlight': return <ProductSpotlightModule fields={fields} />
    case 'seasonal-items': return <SeasonalItemsModule fields={fields} />
    case 'custom-url': return <CustomUrlModule fields={fields} />
    case 'sustainability-info': return <SustainabilityInfoModule fields={fields} />
    case 'news-ticker': return <NewsTickerModule fields={fields} />
    case 'powerbi': return <PowerBIModule fields={fields} />
    case 'plecto': return <PlectoModule fields={fields} />
    case 'data-source': return <DataSourceModule fields={fields} />
    default: return (
      <div className="flex items-center justify-center h-full text-zinc-400 text-2xl font-medium">
        Ukjent modul: {moduleKey}
      </div>
    )
  }
}
