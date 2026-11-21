import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, Scroll } from '@angular/router';
import { take } from 'rxjs';
import { STATUTE } from './statute.data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-statute',
  imports: [NgTemplateOutlet],
  templateUrl: './statute.component.html',
  styleUrl: './statute.component.scss'
})
export class StatuteComponent implements OnDestroy {
  readonly statute = STATUTE;
  readonly sections = [STATUTE.preamble, ...STATUTE.sections];
  readonly indexEntries = [
    ...this.sections.map(section => ({ id: section.id, label: section.label, title: section.title })),
    { id: 'disposicion-final', label: '', title: STATUTE.finalProvision.title }
  ];
  readonly titleCount = STATUTE.sections.length;
  readonly articleCount = STATUTE.sections.reduce((total, section) => total + section.articles.length, 0);
  readonly activeSection = signal(STATUTE.preamble.id);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);
  private observer?: IntersectionObserver;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof Scroll && event.anchor && !event.position && event.scrollBehavior !== 'manual') {
        const fragment = event.anchor;
        afterNextRender(() => this.scrollToFragment(fragment), { injector: this.injector });
      }
    });

    afterNextRender(() => {
      const sections = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('section'));
      const header = document.querySelector('app-header header');
      const offset = header ? Math.ceil(header.getBoundingClientRect().height) + 16
        : parseFloat(getComputedStyle(this.element.nativeElement).getPropertyValue('--statute-offset'));

      if (typeof IntersectionObserver !== 'undefined') {
        this.observer = new IntersectionObserver(() => {
          const crossed = sections.filter(section => section.getBoundingClientRect().top <= offset + 1);
          this.activeSection.set(crossed.at(-1)?.id ?? sections[0].id);
        }, { rootMargin: `-${offset}px 0px -${Math.max(0, window.innerHeight - offset - 1)}px 0px` });
        sections.forEach(section => this.observer!.observe(section));
      }

      this.route.fragment.pipe(take(1)).subscribe(fragment => {
        if (!fragment) return;
        this.scrollToFragment(fragment);
      });
    });
  }

  navigateToSection(event: MouseEvent, id: string): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = this.element.nativeElement.querySelector<HTMLElement>('#' + id)!;
    const details = this.element.nativeElement.querySelector('details');
    if (details) details.open = false;
    target.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
    target.querySelector('h2')!.focus({ preventScroll: true });
    this.activeSection.set(id);
    void this.router.navigate([], { fragment: id, replaceUrl: true, scroll: 'manual' });
  }

  private scrollToFragment(fragment: string): void {
    const target = Array.from(this.element.nativeElement.querySelectorAll<HTMLElement>('section, article'))
      .find(element => element.id === fragment);
    if (target) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
      this.activeSection.set(target.closest('section')!.id);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
