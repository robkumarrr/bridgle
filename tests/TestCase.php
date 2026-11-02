<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Application;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    /**
     * Override createApplication so APP_ENV=testing is visible via getenv()
     * before the app bootstraps. This is required because Docker's env_file
     * sets APP_ENV=local at the OS level, and Dotenv createImmutable() reads
     * getenv() — meaning phpunit.xml <env> tags (which only set $_ENV) have
     * no effect. Setting putenv() here wins the race.
     */
    public function createApplication(): Application
    {
        putenv('APP_ENV=testing');
        $_ENV['APP_ENV']    = 'testing';
        $_SERVER['APP_ENV'] = 'testing';

        return parent::createApplication();
    }

    /**
     * Feature tests render the Inertia root view, whose @vite tag needs either
     * a running dev server (public/hot) or built assets (public/build). CI has
     * neither, and tests don't need real assets, so stub Vite out.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
