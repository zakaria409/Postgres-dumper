import React from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { StatusBar } from './StatusBar';

interface MainLayoutProps {
    children: React.ReactNode;
    isConnected: boolean;
}

export function MainLayout({ children, isConnected }: MainLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-gunmetal overflow-hidden">
            <NavigationSidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <StatusBar isConnected={isConnected} />
                <main className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-[1200px] mx-auto">
                        {children}
                    </div>

                    {/* Subtle background decoration */}
                    <div className="fixed -bottom-32 -right-32 w-96 h-96 bg-ember/5 rounded-full blur-[100px] pointer-events-none" />
                    <div className="fixed -top-32 -left-32 w-96 h-96 bg-khaki-beige/5 rounded-full blur-[100px] pointer-events-none" />
                </main>
            </div>
        </div>
    );
}
